pragma solidity ^0.5;
import "github.com/provable-things/ethereum-api/provableAPI_0.5.sol";

contract ERC20 {
    function transfer(address recipient, uint256 amount) public returns (bool);
    function balanceOf(address account) public view returns (uint256);
    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool);
}

contract BettexEth is usingProvable {
    ERC20 USDT = ERC20(0x25211B0C499f143E7B6f09eC38C7e60d78E37d15);
    
    address public creator = msg.sender;
    
    uint public lastBlock = block.number;
    uint public contractCreated = block.number;
    
    mapping (uint => bytes32) public proofsByBlock;
    mapping (address => uint) public userBalances;
    
    /* event results */
    event FetchEventNeedGas(uint needGas);
    
    mapping (bytes32 => address) public provenByAddress;    
    
    function __callback(bytes32 myid, string memory result) public {
        myid;
        bytes32 hash = keccak256(abi.encodePacked(result));
        provenByAddress[hash] = msg.sender;
    }
    
    function fetchEventResult (uint sportId, uint year, uint month, uint day, uint country, uint league, uint matchId, uint gasForCb) public payable {
        uint gasForProvable = provable_getPrice("URL", gasForCb);
        
        if (msg.value < gasForProvable) {
            msg.sender.transfer(msg.value);
            emit FetchEventNeedGas(gasForProvable);
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

   function bytes2uint(bytes memory s, uint start, uint end) internal pure returns (uint64) {
        uint64 retval = 0;
        for (uint i = start; i < end; i++) {
            retval = retval * 10 + (uint8(s[i]) - 48);
        }
        return retval;
    }
    
    function bytesSlice(bytes memory s, uint start, uint end) internal pure returns (bytes memory) {
        bytes memory retval = new bytes(end - start);
        for (uint i = start; i < end; i++) {
            retval[i - start] = s[i];
        }
        return retval;
    }

 
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
    uint constant STATE_INTVALUE = 4;
    
    uint64 constant subevent_t1 = 1;
    uint64 constant subevent_t2 = 2;
    uint64 constant subevent_draw = 3;
    
    function parseEventResult(bytes memory input) public {
        uint64 eventid = 0;
        uint statusid = 0;
        uint periods_ft_home = 0;
        uint periods_ft_away = 0;

        uint state = STATE_VALUE;
        uint depth = 0;
        uint stringStart;
        bytes32[] memory path = new bytes32[](5);

        for (uint p = 0; p < input.length; p++) {
            byte c = input[p];
            if (state == STATE_INTVALUE) {
                if ((c < "0") || (c > "9")) {
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
                if ((c >= "0") && (c <= "9")) {
                    stringStart = p;
                    state = STATE_INTVALUE;
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
    
    function setEventStatus(uint64 eventid, uint64 subevent, bool isForWon) internal {
        eventStatus[getEventHash(eventid, subevent)] = isForWon ? 1 : 2;
    }
    
    function getEventStatus(uint64 eventid, uint64 subevent) internal view returns (uint) {
        return eventStatus[getEventHash(eventid, subevent)];
    }
    
    function payoutHash(uint[] memory bets) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("payout", bets));
    }
    
    event PayoutRequest (uint blocknumber, uint[] bets);
    event PayoutDone (address account, uint amount, uint bet);
    event CancelDone(address account, uint amount, uint bet);
    event RefundDone(address account, uint amount, uint bet);
    
    function payouts(uint[] calldata bets) external {
        addActionProof(payoutHash(bets));
        emit PayoutRequest (block.number, bets);
    }
    
    // return unmatched
    function paycancel(uint betid) internal {
        BetItem storage bet = allBets[betid];
        uint amount = bet.amount - bet.matched - bet.cancelled;
        USDT.transfer(bet.owner, amount);
        emit CancelDone(bet.owner, amount, betid);
    }

    // return matched + unmatched
    function payrefund(uint betid) internal {
        BetItem storage bet = allBets[betid];
        uint amount = bet.amount - bet.cancelled;
        USDT.transfer(bet.owner, amount);
        emit RefundDone(bet.owner, amount, betid);
    }
    
    // return unmatched + matched + matched_peer
    function payout(uint betid) internal {
        BetItem storage bet = allBets[betid];
        // unmatched + matched + matched_peer
        uint amount = bet.amount - bet.cancelled + bet.matched_peer;
        USDT.transfer(bet.owner, amount);
        emit PayoutDone(bet.owner, amount, betid);
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
    
    /* deposit */
    event Deposit(uint blocknumber, address account, uint amount);
    event DepositPlayed(address account, uint amount, uint balance);
    
    function depositHash (address account, uint amount) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("deposit", account, amount));
    }
    
    function deposit(uint amount) external {
        // if (!USDT.transferFrom(msg.sender, address(this), amount)) {
        //     revert();
        // }
        addActionProof(depositHash(msg.sender, amount));
        emit Deposit(block.number, msg.sender, amount);
    }
    
    /* withdraw */
    event Withdraw (uint blocknumber, address account, uint amount);
    event WithdrawPlayed (address account, uint amount, uint balance);
    event WithdrawPlayFailed (address account, uint amount);
    
    function withdrawHash (address account, uint amount) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("withdraw", account, amount));
    }
    
    function withdraw(uint amount) external {
        addActionProof(withdrawHash(msg.sender, amount));
        emit Withdraw(block.number, msg.sender, amount);
    }
    
    /* bet */
    event Bet (uint blocknumber, address account, uint eventid, uint subevent, uint amount, uint odds, bool side);
    event BetPlayed (address account, uint eventid, uint subevent, uint amount, uint odds, bool side);
    event BetPlayFailed (address account, uint eventid, uint subevent, uint amount, uint odds, bool side);
    
    function betHash (address account, uint eventid, uint subevent, uint amount, uint odds, bool side) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("bet", account, eventid, subevent, amount, odds, side));
    }
    
    function bet (uint eventid, uint subevent, uint amount, uint odds, bool side) external {
        require(odds > ODDS_PRECISION);
        require(odds <= ODDS_PRECISION * ODDS_PRECISION);
        addActionProof(betHash(msg.sender, eventid, subevent, amount, odds, side));
        emit Bet (block.number, msg.sender, eventid, subevent, amount, odds, side);
    }
    
    /* cancel */
    event Cancel (uint blocknumber, address account, uint betid);
    event CancelPlayed (uint betid);
    event CancelPlayFailed (uint betid);
    
    function cancelHash (address account, uint betid) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("cancel", account, betid));
    }
    
    function cancel (uint betid) external {
        addActionProof(cancelHash(msg.sender, betid));
        emit Cancel (block.number, msg.sender, betid);
    }
    
    /* bets structures */
    
    uint constant public ODDS_PRECISION = 100;

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
    
    mapping (bytes32 => uint) public eventState;

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
        if (userBalances[account] < amount) {
            return false;
        }
        userBalances[account] -= amount;
        
        bytes32 eventHash = getEventHash(eventid, subevent);
        SortedIteratorHelper storage betsForThisSide = side ? betsForEvents[eventHash].betsFor : betsForEvents[eventHash].betsAgainst;
        SortedIteratorHelper storage betsForOpposite = side ? betsForEvents[eventHash].betsAgainst : betsForEvents[eventHash].betsFor;
        
        // add bet
        uint betThisSide = BetsForEvent_add(betsForThisSide, account, eventid, subevent, amount, odds, side, hint_add_odds_this);

        // consume unspent from opposite
        BetsForEvent_consumeTop(betsForOpposite, allBets[betThisSide]);
        return true;
    }
    
    function nextNonzero(uint startFrom) public view returns (uint) {
        for (uint i = startFrom; i <= block.number; i++) {
            if (proofsByBlock[i] != 0) {
                return i;
            }
        }
        return 0;
    }

    
    /* playback of actions */
    
    uint public startCommitWith = 0;
    event OutOfGasWhileReplay(uint blocknumber, uint pos);
    
    function playback(uint minGas, bytes32[] calldata compressedActions) external {
        // pass 1 - check, pass2 - execute
        bool commit = false;
        do {
            for (uint pos = 0; pos < compressedActions.length; ) {
                uint blocknumber = uint(compressedActions[pos++]);
                
                if (commit) {
                    require(blocknumber > lastBlock, "already mined");
                }
                
                uint chainlen = uint(compressedActions[pos++]);

                // check for skipped nonzero blocks once, during the check pass            
                if (commit) {
                    for (uint i = lastBlock + 1; i < blocknumber; i++) {
                        if (proofsByBlock[i] != 0) {
                            revert("you skipped some nonzero blocks");
                        }
                    }
                }
                bytes32 currentHash = 0;

                for (uint i = 0; i < chainlen; i++) {
                    if (commit && (gasleft() < minGas)) {
                        startCommitWith = i;
                        lastBlock = blocknumber;
                        emit OutOfGasWhileReplay(blocknumber, i);
                        return;
                    }
                    
                    bytes32 action = compressedActions[pos++];
                    
                    if (action == bytes32("deposit")) {
                        address account = address(uint256(compressedActions[pos++]));
                        uint amount = uint(compressedActions[pos++]);
                        if (commit && (i >= startCommitWith)) {
                            uint balance = userBalances[account] + amount;
                            userBalances[account] = balance;
                            emit DepositPlayed(account, amount, balance);
                        } else {
                            currentHash = keccak256(abi.encodePacked(currentHash, depositHash(account, amount)));
                        }
                    }
                    
                    if (action == bytes32("withdraw")) {
                        address account = address(uint256(compressedActions[pos++]));
                        uint amount = uint(compressedActions[pos++]);
                        if (commit && (i >= startCommitWith)) {
                            if (userBalances[account] >= amount) {
                                if (USDT.transfer(address(this), amount)) {
                                    uint balance = userBalances[account] - amount;
                                    userBalances[account] = balance;
                                    emit WithdrawPlayed(account, amount, balance);
                                } else {
                                    emit WithdrawPlayFailed(account, amount);
                                }
                            }
                        } else {
                            currentHash = keccak256(abi.encodePacked(currentHash, withdrawHash(account, amount)));
                        }
                    }
                    
                    if (action == bytes32("bet")) {
                        address account = address(uint256(compressedActions[pos++]));
                        uint64 eventid = uint64(uint(compressedActions[pos++]));
                        uint64 subevent = uint64(uint(compressedActions[pos++]));
                        uint64 amount = uint64(uint(compressedActions[pos++]));
                        uint64 odds = uint64(uint(compressedActions[pos++]));
                        bool side = uint(compressedActions[pos++]) != 0;
                        uint hint_add_odds_this = uint(compressedActions[pos++]);
                        if (commit && (i >= startCommitWith)) {
                            if (tryDoBet(account, eventid, subevent, amount, odds, side, hint_add_odds_this)) {
                                emit BetPlayed(account, eventid, subevent, amount, odds, side);
                            } else {
                                emit BetPlayFailed(account, eventid, subevent, amount, odds, side);
                            }
                        } else {
                            currentHash = keccak256(abi.encodePacked(currentHash, betHash(account, eventid, subevent, amount, odds, side)));
                        }
                    }
                    
                    if (action == bytes32("cancel")) {
                        address account = address(uint256(compressedActions[pos++]));
                        uint betid = uint(compressedActions[pos++]);
                        BetItem storage cancel_bet = allBets[betid];
                        if (commit && (i >= startCommitWith)) {
                            uint64 cancel_amount = cancel_bet.amount - cancel_bet.matched - cancel_bet.cancelled;
                            if ((cancel_bet.owner == account) && (cancel_amount > 0)) {
                                cancel_bet.cancelled += cancel_amount;
                                userBalances[account] += cancel_amount;
                                emit CancelPlayed(betid);
                            } else {
                                emit CancelPlayFailed(betid);
                            }
                        } else {
                            currentHash = keccak256(abi.encodePacked(currentHash, cancelHash(account, betid)));
                        }
                    }

                    if (action == bytes32("payouts")) {
                        uint betlen = uint256(compressedActions[pos++]);
                        uint[] memory bets = new uint[](betlen);
                        if (commit && (i >= startCommitWith)) {
                            processPayouts(bets);
                        } else {
                            currentHash = keccak256(abi.encodePacked(currentHash, payoutHash(bets)));
                        }
                    }
                }
                if (commit) {
                    startCommitWith = 0;
                    lastBlock = blocknumber;
                } else {
                    require(currentHash == proofsByBlock[blocknumber], "hash mismatch");
                }
            }
        commit = !commit;
        } while (commit != false);
    }

    function addActionProof(bytes32 hash) internal {
        proofsByBlock[block.number] = keccak256(abi.encodePacked(proofsByBlock[block.number], hash));
    }

    function uint2str_pad(uint i) internal pure returns (string memory s) {
        if (i >= 10) {
            return uint2str(i);
        }
        return string(abi.encodePacked("0", uint2str(i)));
    }
    
    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len - 1;
        while (_i != 0) {
            bstr[k--] = byte(uint8(48 + _i % 10));
            _i /= 10;
        }
        return string(bstr);
    }
    
    // function uint2hexstr(uint i) internal pure returns (string memory) {
    //     if (i == 0) return "0";
    //     uint j = i;
    //     uint length;
    //     while (j != 0) {
    //         length++;
    //         j = j >> 4;
    //     }
    //     uint mask = 15;
    //     bytes memory bstr = new bytes(length);
    //     uint k = length - 1;
    //     while (i != 0){
    //         uint8 curr = uint8(i & mask);
    //         bstr[k--] = curr > 9 ? byte(55 + curr ) : byte(48 + curr); // 55 = 65 - 10
    //         i = i >> 4;
    //     }
    //     return string(bstr);
    // }
    
    function fromHexChar(byte c) internal pure returns (uint) {
        if (byte(c) >= byte('0') && byte(c) <= byte('9')) {
            return uint8(c) - uint8(byte('0'));
        }
        if (byte(c) >= byte('a') && byte(c) <= byte('f')) {
            return 10 + uint8(c) - uint8(byte('a'));
        }
        if (byte(c) >= byte('A') && byte(c) <= byte('F')) {
            return 10 + uint8(c) - uint8(byte('A'));
        }
    }

    // Convert an hexadecimal string to raw bytes
    function fromHex(bytes memory ss, uint start, uint end) public pure returns (uint) {
        uint r = 0;
        for (uint i = start; i < end; i++) {
            r = r * 16 + fromHexChar(ss[i]);
        }
        return r;
    }
    
    /* iterator */
    
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
