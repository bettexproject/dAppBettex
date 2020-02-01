pragma solidity ^0.5;

contract Bettex {
    
    uint constant public ODDS_PRECISION = 100;
    
    uint public firstBlock = block.number;

    function betHash (address account, uint eventid, uint subevent, uint amount, uint odds, bool side) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("bet", account, eventid, subevent, amount, odds, side));
    }
    
    function bet (uint eventid, uint subevent, uint amount, uint odds, bool side) external {
        require(odds > ODDS_PRECISION);
        require(odds <= ODDS_PRECISION * ODDS_PRECISION);
        addActionProof(betHash(msg.sender, eventid, subevent, amount, odds, side), 2, false);
    }
    
    event Deposit(address account, uint amount);

    function depositHash (address account, uint amount) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("deposit", account, amount));
    }
    
    function deposit(uint amount) external {
        // if (!USDT.transferFrom(msg.sender, address(this), amount)) {
        //     revert();
        // }
        addActionProof(depositHash(msg.sender, amount), 1, false);
        emit Deposit(msg.sender, amount);
    }
    
    function withdrawHash (address account, uint amount) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("withdraw", account, amount));
    }
    
    function withdraw(uint amount) external {
        addActionProof(withdrawHash(msg.sender, amount), 1, true);
    }

    function cancelHash (address account, uint betid) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("cancel", account, betid));
    }
    
    function cancel (uint betid) external {
        addActionProof(cancelHash(msg.sender, betid), 1, false);
    }

    struct ProofItem {
        uint8 currentLen;
        bytes31 hash;
    }
    
    ProofItem public currentProof;
    mapping (uint => ProofItem) public checkpoints;
    uint public currentCheckpoint;
    uint public minedCheckpoint;
    uint public minedOffset;
    
    mapping (address => uint) balanceOfAccount;
    
    /* mine from mined checkpoint + mined offset to next checkpoint */
    function playback(bytes32[] calldata actions, uint minGas) external {
        // two pass: commitPhase = false/true
        bool commitPhase = false;
        bytes31 actionHash = checkpoints[minedCheckpoint].hash;
        do {
            for (uint pos = 0; pos < actions.length;) {
                if (gasleft() < minGas) {
                    minedOffset = pos;
                    return;
                }
                bytes32 func = actions[pos++];
                if (func == bytes32("deposit")) {
                    address account = address(uint256(actions[pos++]));
                    uint amount = uint256(actions[pos++]);
                    if (commitPhase && (pos >= minedOffset)) {
                        balanceOfAccount[account] += amount;
                    } else {
                        actionHash = bytes31(keccak256(abi.encodePacked(actionHash, depositHash(account, amount))));
                    }
                }
                if (func == bytes32("withdraw")) {
                    address account = address(uint256(actions[pos++]));
                    uint amount = uint256(actions[pos++]);
                    if (commitPhase && (pos >= minedOffset)) {
                        if (balanceOfAccount[account] >= amount) {
                            balanceOfAccount[account] -= amount;
                            // TODO ERC transfer
                        }
                    } else {
                        actionHash = bytes31(keccak256(abi.encodePacked(actionHash, withdrawHash(account, amount))));
                    }
                }
                if (func == bytes32("bet")) {
                    address account = address(uint256(actions[pos++]));
                    uint64 eventid = uint64(uint256(actions[pos++]));
                    uint64 subevent = uint64(uint256(actions[pos++]));
                    uint64 amount = uint64(uint256(actions[pos++]));
                    uint64 odds = uint64(uint256(actions[pos++]));
                    bool side = uint256(actions[pos++]) != 0;
                    if (commitPhase && (pos >= minedOffset)) {
                        tryDoBet(account, eventid, subevent, amount, odds, side, 0);
                    } else {
                        actionHash = bytes31(keccak256(abi.encodePacked(actionHash, betHash(account, eventid, subevent, amount, odds, side))));
                    }
                }
                if (func == bytes32("cancel")) {
                    address account = address(uint256(actions[pos++]));
                    uint betid = uint(actions[pos++]);
                    if (commitPhase && (pos >= minedOffset)) {
                    } else {
                        actionHash = bytes31(keccak256(abi.encodePacked(actionHash, cancelHash(account, betid))));
                    }
                }
            }
            if (!commitPhase) {
                require(actionHash == checkpoints[minedCheckpoint + 1].hash, "action hash mismatch");
            } else {
                minedOffset = 0;
                minedCheckpoint++;
            }
            commitPhase = !commitPhase;
        } while (commitPhase != false);
    }
    
    struct BetItem {
        address owner;
        bool side;
        bool paid;
        uint64 eventid;
        uint64 subevent;

        uint64 amount;
        uint64 odds;
        uint64 matched;
        uint64 matched_peer;
        uint64 cancelled;
    }
    
    mapping (uint => BetItem) public allBets;
    uint public allBetsSeq;
    
    function allBets_add(address owner, bool side, uint64 eventid, uint64 subevent, uint64 amount, uint64 odds) internal {
        ++allBetsSeq;
        allBets[allBetsSeq] = BetItem(owner, false, side, eventid, subevent, amount, odds, 0, 0, 0);
    }
    
    function BetsForEvent_consumeTop(SortedIteratorHelper storage oppositeSide, BetItem storage betThisSide) internal {
        uint topIdx = oppositeSide.firstKey;
        while (topIdx != 0) {
            BetItem storage topBet = allBets[topIdx];
            if (betThisSide.side && (topBet.odds < betThisSide.odds)) {
                break;
            }
            if (!betThisSide.side && (topBet.odds > betThisSide.odds)) {
                break;
            }
            
            BetItem storage betFor = betThisSide.side ? betThisSide : topBet;
            BetItem storage betAgainst = !betThisSide.side ? betThisSide : topBet;
            uint oddsToMatch = betThisSide.side ? betThisSide.odds : topBet.odds;
            uint maxFor = (betFor.amount - betFor.matched - betFor.cancelled) * (oddsToMatch - ODDS_PRECISION) / ODDS_PRECISION;
            uint maxAgainst = (betAgainst.amount - betAgainst.matched - betAgainst.cancelled);
            uint maxNominal = maxFor < maxAgainst ? maxFor : maxAgainst;
            uint spentFor = maxNominal * ODDS_PRECISION / (oddsToMatch - ODDS_PRECISION);
            uint spentAgainst = maxNominal;
            betFor.matched += uint64(spentFor);
            betFor.matched_peer += uint64(spentAgainst);
            betAgainst.matched += uint64(spentAgainst);
            betAgainst.matched_peer += uint64(spentFor);
            
            if (betThisSide.amount - betThisSide.matched - betThisSide.cancelled < 10) {
                betThisSide.amount = betThisSide.matched + betThisSide.cancelled;
                break;
            }
            topIdx = oppositeSide.nextKeys[topIdx];

        }
        oppositeSide.firstKey = topIdx;
    }
    
    function BetsForEvent_add(SortedIteratorHelper storage thisSide, address owner, uint64 eventid, uint64 subevent, uint64 amountRemains, uint64 odds, bool side, uint hint) internal returns (uint) {
        allBets_add(owner, side, eventid, subevent, amountRemains, odds);
        SortedIteratorHelper_addValue(thisSide, side ? odds : -odds, allBetsSeq, hint);
        return allBetsSeq;
    }
    
    struct BetsForEvent {
        SortedIteratorHelper betsFor;
        SortedIteratorHelper betsAgainst;
    }

    
    mapping (bytes32 => BetsForEvent) betsForEvents;
    
    function getEventHash(uint64 eventid, uint64 subevent) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(eventid, subevent));
    }
    
    function tryDoBet(address account, uint64 eventid, uint64 subevent, uint64 amount, uint64 odds, bool side, uint hint_add_odds_this) internal returns (bool) {
        if (balanceOfAccount[account] < amount) {
            return false;
        }
        balanceOfAccount[account] -= amount;
        
        bytes32 eventHash = getEventHash(eventid, subevent);
        SortedIteratorHelper storage betsForThisSide = side ? betsForEvents[eventHash].betsFor : betsForEvents[eventHash].betsAgainst;
        SortedIteratorHelper storage betsForOpposite = side ? betsForEvents[eventHash].betsAgainst : betsForEvents[eventHash].betsFor;
        
        // add bet
        uint betThisSide = BetsForEvent_add(betsForThisSide, account, eventid, subevent, amount, odds, side, hint_add_odds_this);

        // consume unspent from opposite
        BetsForEvent_consumeTop(betsForOpposite, allBets[betThisSide]);
        return true;
    }
    
    function saveCheckpoint() internal {
        ProofItem memory t;
        t.currentLen = currentProof.currentLen;
        t.hash = currentProof.hash;
        uint c = currentCheckpoint;
        currentCheckpoint = c + 1;
        checkpoints[c + 1] = t;
    }
    
    function addActionProof(bytes32 proof, uint len, bool force) internal {
        uint newLen = currentProof.currentLen + len;
        if (newLen > 255) {
            saveCheckpoint();
            newLen = len;
        }
        currentProof.hash = bytes31(keccak256(abi.encodePacked(currentProof.hash, proof)));
        currentProof.currentLen = uint8(newLen);
        if (force) {
            saveCheckpoint();
            currentProof.currentLen = 0;
        }
    }
    
        struct SortedIteratorHelper {
        mapping (uint => uint) nextKeys;
        mapping (uint => int) values;
        uint firstKey;
    }
    
    function SortedIteratorHelper_insertAfter(SortedIteratorHelper storage iterator, uint left, uint key) internal {
        if (left == 0) {
            iterator.firstKey = key;
            iterator.nextKeys[key] = 0;
        } else {
            iterator.nextKeys[key] = iterator.nextKeys[left];
            iterator.nextKeys[left] = key;
        }
    }
    
    function SortedIteratorHelper_addValue(SortedIteratorHelper storage iterator, int sortValue, uint key, uint hintAfter) internal {
        // check hint
        if (hintAfter != 0) {
            if (iterator.values[hintAfter] <= sortValue) {
                uint right = iterator.nextKeys[hintAfter];
                if (iterator.values[right] >= sortValue) {
                    SortedIteratorHelper_insertAfter(iterator, hintAfter, key);
                    return;
                }
            }
        }
        // hint failed, do search
        uint left = 0;
        uint right = iterator.firstKey;
        while (right != 0) {
            if (iterator.values[right] >= sortValue) {
                break;
            }
            left = right;
            right = iterator.nextKeys[right];
        }
        SortedIteratorHelper_insertAfter(iterator, left, key);
    }
}
