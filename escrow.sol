pragma solidity ^0.6;
import "github.com/provable-things/ethereum-api/provableAPI_0.6.sol";


contract Bettex is usingProvable {
    
    uint constant public ODDS_PRECISION = 100;
    bytes32 constant keccak_id = keccak256(abi.encodePacked("_id"));
    bytes32 constant keccak_status = keccak256(abi.encodePacked("status"));
    bytes32 constant keccak_periods = keccak256(abi.encodePacked("periods"));
    bytes32 constant keccak_ft = keccak256(abi.encodePacked("ft"));
    bytes32 constant keccak_home = keccak256(abi.encodePacked("home"));
    bytes32 constant keccak_away = keccak256(abi.encodePacked("away"));

    uint constant STATE_VALUE = 0;
    uint constant STATE_LIST = 1;
    uint constant STATE_KEY = 2;
    uint constant STATE_STRINGVALUE = 3;
    uint constant STATE_ORDVALUE = 4;
    
    uint64 constant subevent_t1 = 1;
    uint64 constant subevent_t2 = 2;
    uint64 constant subevent_draw = 3;
    
    uint public firstBlock = block.number;
    
    mapping (bytes32 => bytes32) public callbackProofs;
    
    function parseEventResult(bytes memory input) internal {
        uint64 eventid = 0;
        uint statusid = 0;
        uint periods_ft_home = 0;
        uint periods_ft_away = 0;

        uint state = STATE_VALUE;
        uint depth = 0;
        uint stringStart;
        bytes32[] memory path = new bytes32[](10);

        for (uint p = 0; p < input.length; p++) {
            byte c = input[p];
            require(depth >= 0, "depth underflow");
            require(depth < 10, "depth overflow");
            // if (depth >= 10) {
            //      bytes memory k = bytesSlice(input, stringStart, p);
            //      revert(string(k));
            // }
            if (state == STATE_ORDVALUE) {
                if ((c == " ") || (c == ":")) {
                    continue;
                }
                if ((c == ",")||(c == "}")) {
                    // react to int values by some paths
                    // _id
                    if (path[1] == keccak_id) {
                        eventid = bytes2uint(input, stringStart, p);
                    }
                    // status._id
                    else if ((depth == 2) && (path[1] == keccak_status) && (path[2] == keccak_id)) {
                        statusid = bytes2uint(input, stringStart, p);
                    } else if ((depth == 3) && (path[1] == keccak_periods) && (path[2] == keccak_ft)) {
                        if (path[3] == keccak_home) {
                            // periods.ft.home
                            periods_ft_home = bytes2uint(input, stringStart, p);
                        } else if (path[3] == keccak_away) {
                            // periods.ft.away
                            periods_ft_away = bytes2uint(input, stringStart, p);
                        }
                    }
                    state = STATE_LIST;
                    if (c== "}") {
                        depth--;
                    }
                    continue;
                }
            }
            if (state == STATE_VALUE) {
                if (c == "{") {
                    state = STATE_LIST;
                    depth++;
                    continue;
                }
                if (c == "\"") {
                    state = STATE_STRINGVALUE;
                    stringStart = p + 1;
                    continue;
                }
                if ((c != ":") && (c != " ") && (c != "\"")) {
                    stringStart = p;
                    state = STATE_ORDVALUE;
                    continue;
                }
            }
            if (state == STATE_STRINGVALUE) {
                if (c == "\"") {
                    // bytes memory valuestring = bytesSlice(input, stringStart, p);
                    state = STATE_LIST;
                    continue;
                }
            }
            if (state == STATE_LIST) {
                if (c == "\"") {
                    state = STATE_KEY;
                    stringStart = p + 1;
                    continue;
                }
                if (c == "}") {
                    depth--;
                    continue;
                }
            }
            if (state == STATE_KEY) {
                if (c == "\"") {
                    bytes memory keystring = bytesSlice(input, stringStart, p);
                    path[depth] = keccak256(abi.encodePacked(keystring));
                    state = STATE_VALUE;
                    continue;
                }
            }
        }

        // finished
        if ((statusid == 100) || (statusid == 110) || (statusid == 120) || (statusid == 125)) {
            setEventStatus(eventid, subevent_t1, periods_ft_home > periods_ft_away);
            setEventStatus(eventid, subevent_t2, periods_ft_home < periods_ft_away);
            setEventStatus(eventid, subevent_draw, periods_ft_home == periods_ft_away);
        }
    }

    mapping (bytes32 => uint) public eventStatus; // 0 - undefined, 1 - for won, 2 - against won, 3- refund
    
    event EventStatusChanged(uint64, uint64, bool);
    
    function setEventStatus(uint64 eventid, uint64 subevent, bool isForWon) internal {
        emit EventStatusChanged(eventid, subevent, isForWon);
        eventStatus[getEventHash(eventid, subevent)] = isForWon ? 1 : 2;
    }

    function getEventStatus(uint64 eventid, uint64 subevent) public view returns (uint) {
        return eventStatus[getEventHash(eventid, subevent)];
    }
    
    function payoutHash(uint[] memory bets) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("payout", bets));
    }

    
    function payouts(uint[] calldata bets) external {
        addActionProof(payoutHash(bets), bets.length / 4 + 1, true);
    }
    
    // return unmatched
    function paycancel(uint betid) internal {
        BetItem storage bet = allBets[betid];
        uint64 amount = bet.amount - bet.matched - bet.cancelled;
        balanceOfAccount[bet.owner] += amount;
        bet.cancelled += amount;
    }

    // return matched + unmatched
    function payrefund(uint betid) internal {
        BetItem storage bet = allBets[betid];
        uint amount = bet.amount - bet.cancelled;
        balanceOfAccount[bet.owner] += amount;
        bet.cancelled = bet.amount - bet.matched - bet.cancelled;
    }
    
    // return unmatched + matched + matched_peer
    function payout(uint betid) internal {
        BetItem storage bet = allBets[betid];
        // unmatched + matched + matched_peer
        uint amount = bet.amount - bet.cancelled + bet.matched_peer;
        balanceOfAccount[bet.owner] += amount;
        bet.cancelled = bet.amount - bet.matched - bet.cancelled;
    }
    
    function processPayouts(uint[] memory bets) internal {
        for (uint i = 0; i < bets.length; i++) {
            uint betid = bets[i];
            BetItem storage bet = allBets[betid];
            
            if (bet.paid) {
                continue;
            }
            
            uint betResult = getEventStatus(bet.eventid, bet.subevent);
            if (betResult == 0) {
                continue;
            }
            
            if ((betResult == 1) && bet.side) {
                payout(betid);
            }

            if ((betResult == 1) && !bet.side) {
                paycancel(betid);
            }

            if ((betResult == 2) && !bet.side) {
                payout(betid);
            }

            if ((betResult == 2) && bet.side) {
                paycancel(betid);
            }
            
            if (betResult == 3) {
                payrefund(betid);
            }
            
            bet.paid = true;
        }
    }

    
    function callbackHash(address caller, bytes memory result) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("callback", caller, result));
    }
    
    function __callback(bytes32 myid, string memory result) override public {
        myid;
        addActionProof(callbackHash(msg.sender, bytes(result)), 230, true);
    }
    
    function fetchEventResult (uint sportId, uint year, uint month, uint day, uint country, uint league, uint matchId, uint gasForCb) public payable {
        uint gasForProvable = provable_getPrice("URL", gasForCb);
        
        if (msg.value < gasForProvable) {
            msg.sender.transfer(msg.value);
        } else {
            bytes memory url = abi.encodePacked("json(https://ls.fn.sportradar.com/winline/en/Asia:Yekaterinburg/gismo/sport_matches/",
                uint2str(sportId),
                "/",
                uint2str(year),
                "-",
                uint2str_pad(month),
                "-",
                uint2str_pad(day),
                "/0).doc[0].data.sport.realcategories[",
                uint2str(country),
                "].tournaments[",
                uint2str(league),
                "].matches[",
                uint2str(matchId),
                "]"
            );
            
            provable_query("URL", string(url), gasForCb);
            msg.sender.transfer(msg.value - gasForProvable);
        }
    }

    function betHash (address account, uint eventid, uint subevent, uint amount, uint odds, bool side) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("bet", account, eventid, subevent, amount, odds, side));
    }
    
    function bet (uint eventid, uint subevent, uint amount, uint odds, bool side) external {
        require(odds > ODDS_PRECISION);
        require(odds <= ODDS_PRECISION * ODDS_PRECISION);
        addActionProof(betHash(msg.sender, eventid, subevent, amount, odds, side), 20, false);
    }
    
    event Deposit(address account, uint amount);

    function depositHash (address account, uint amount) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("deposit", account, amount));
    }
    
    function deposit(uint amount) external {
        // if (!USDT.transferFrom(msg.sender, address(this), amount)) {
        //     revert();
        // }
        addActionProof(depositHash(msg.sender, amount), 8, false);
        emit Deposit(msg.sender, amount);
    }
    
    function withdrawHash (address account, uint amount) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("withdraw", account, amount));
    }
    
    function withdraw(uint amount) external {
        addActionProof(withdrawHash(msg.sender, amount), 8, true);
    }

    function cancelHash (address account, uint betid) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("cancel", account, betid));
    }
    
    function cancel (uint betid) external {
        addActionProof(cancelHash(msg.sender, betid), 8, false);
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
    
    mapping (address => uint) public balanceOfAccount;
    
    event R(bytes);
    event L(uint);

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
                
                if (func == bytes32("__callback")) {
                    address account = address(uint256(actions[pos++]));
                    uint len = uint256(actions[pos++]);
                    bytes memory data = new bytes(len);
        
                    for (uint pp = 0; pp < len; pp++) {
                        uint wordpos = pp / 32 + pos;
                        uint wordoffset =  (31 - (pp % 32)) * 8;
                        uint w = uint256(actions[wordpos]);
                        data[pp] = byte(uint8(w >> wordoffset));
                    }

                    pos += (len + 31) / 32;
                    
                    if (commitPhase && (pos >= minedOffset)) {
                        if (account == provable_cbAddress()) {
                            parseEventResult(data);
                        }
                    } else {
                        actionHash = bytes31(keccak256(abi.encodePacked(actionHash, callbackHash(account, data))));
                    }
                } else if (func == bytes32("deposit")) {
                    address account = address(uint256(actions[pos++]));
                    uint amount = uint256(actions[pos++]);
                    if (commitPhase && (pos >= minedOffset)) {
                        balanceOfAccount[account] += amount;
                    } else {
                        actionHash = bytes31(keccak256(abi.encodePacked(actionHash, depositHash(account, amount))));
                    }
                } else if (func == bytes32("withdraw")) {
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
                } else if (func == bytes32("bet")) {
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
                } else if (func == bytes32("cancel")) {
                    address account = address(uint256(actions[pos++]));
                    uint betid = uint(actions[pos++]);
                    if (commitPhase && (pos >= minedOffset)) {
                        BetItem storage cancellingBet = allBets[betid];
                        if (cancellingBet.owner == account) {
                            paycancel(betid);
                        }
                    } else {
                        actionHash = bytes31(keccak256(abi.encodePacked(actionHash, cancelHash(account, betid))));
                    }
                } else if (func == bytes32("payouts")) {
                    uint betlen = uint256(actions[pos++]);
                    uint[] memory bets = new uint[](betlen);
                    for (uint x = 0; x < betlen; x++) {
                        bets[x] = uint256(actions[pos++]);
                    }
                    if (commitPhase && (pos >= minedOffset)) {
                        processPayouts(bets);
                    } else {
                        actionHash = bytes31(keccak256(abi.encodePacked(actionHash, payoutHash(bets))));
                    }
                } else {
                    revert("invalid action code");
                }

            }
            if (!commitPhase) {
                // require(actionHash == checkpoints[minedCheckpoint + 1].hash, "action hash mismatch");
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
    
        function uint2str_pad(uint i) internal pure returns (string memory s) {
        if (i >= 10) {
            return uint2str(i);
        }
        return string(abi.encodePacked("0", uint2str(i)));
    }
    
   function bytes2uint(bytes memory s, uint start, uint end) internal pure returns (uint64) {
        uint64 retval = 0;
        for (uint i = start; i < end; i++) {
            retval = retval * 10 + (uint8(s[i]) - 48);
        }
        return retval;
    }
    
    function bytesSlice(bytes memory s, uint start, uint end) internal pure returns (bytes memory) {
        if (end <= start) {
            return "";
        }
        bytes memory retval = new bytes(end - start);
        for (uint i = start; i < end; i++) {
            retval[i - start] = s[i];
        }
        return retval;
    }
}
