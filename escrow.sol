pragma solidity ^0.5;
import "github.com/provable-things/ethereum-api/provableAPI_0.5.sol";

contract ERC20 {
    function transfer(address recipient, uint256 amount) public returns (bool);
    function balanceOf(address account) public view returns (uint256);
    function transferFrom(address sender, address recipient, uint256 amount) public returns (bool);
}

contract BettexEth is usingProvable {
    ERC20 USDT = ERC20(0x25211B0C499f143E7B6f09eC38C7e60d78E37d15);
    
    uint public lastBlock = block.number;
    uint public contractCreated = block.number;
    
    mapping (uint => bytes32) public proofsByBlock;
    mapping (address => uint) public userBalances;
    
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
    
    /* bets structures */
    
    uint constant public ODDS_PRECISION = 1000;

    struct BetItem {
        address owner;
        bool side;
        uint64 eventid;
        uint64 subevent;

        uint64 amount;
        uint64 odds;
        uint64 matched;
        uint64 cancelled;
    }
    
    mapping (uint => BetItem) public allBets;

    uint allBetsSeq;
    
    function allBets_add(address owner, bool side, uint64 eventid, uint64 subevent, uint64 amount, uint64 odds) internal {
        ++allBetsSeq;
        allBets[allBetsSeq] = BetItem(owner, side, eventid, subevent, amount, odds, 0, 0);
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
            betAgainst.matched += uint64(spentAgainst);
            
            if (betThisSide.amount - betThisSide.matched - betThisSide.cancelled < 10**3) {
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
            for (uint pos = commit ? startCommitWith : 0; pos < compressedActions.length; ) {
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
                        startCommitWith = pos;
                        emit OutOfGasWhileReplay(blocknumber, pos);
                        return;
                    }
                    bytes32 action = compressedActions[pos++];
                    
                    if (action == bytes32("deposit")) {
                        address account = address(uint256(compressedActions[pos++]));
                        uint amount = uint(compressedActions[pos++]);
                        if (commit) {
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
                        if (commit) {
                            if (userBalances[account] >= amount) {
                                if (USDT.transfer(address(this), amount)) {
                                    uint balance = userBalances[account] - amount;
                                    userBalances[account] = balance;
                                    emit WithdrawPlayed(account, amount, balance);
                                } else {
                                    emit WithdrawPlayFailed(account, amount);
                                }
                            } else {
                                currentHash = keccak256(abi.encodePacked(currentHash, withdrawHash(account, amount)));
                            }
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
                        if (commit) {
                            if (tryDoBet(account, eventid, subevent, amount, odds, side, hint_add_odds_this)) {
                                emit BetPlayed(account, eventid, subevent, amount, odds, side);
                            } else {
                                emit BetPlayFailed(account, eventid, subevent, amount, odds, side);
                            }
                        } else {
                            currentHash = keccak256(abi.encodePacked(currentHash, betHash(account, eventid, subevent, amount, odds, side)));
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

    
    // function proveAsEvent(uint8 sportId, uint32 year, uint8 month, uint8 day, uint32 country, uint32 league, uint32 matchId) public returns (string memory) {
    //     bytes memory url = abi.encodePacked("json(https://ls.fn.sportradar.com/winline/en/Asia:Yekaterinburg/gismo/sport_matches/",
    //         uint2str(sportId),
    //         "/",
    //         uint2str(year),
    //         "-",
    //         uint2str_pad(month),
    //         "-",
    //         uint2str_pad(day),
    //         "/0).doc[0].data.sport.realcategories[",
    //         uint2str(country),
    //         "].tournaments[",
    //         uint2str(league),
    //         "].matches[",
    //         uint2str(matchId),
    //         "]"
    //     );
        
    //     provable_query("URL", string(url));
    // }
    
    // function __callback(bytes32 myid, string memory result) public {
    //     require (msg.sender == provable_cbAddress());
    //     bytes32 resultHash = keccak256(abi.encodePacked(result));
    //     provenItems[resultHash] = true;
    //     myid = 0;
    // }


    // function uint2str_pad(uint i) internal pure returns (string memory s) {
    //     if (i >= 10) {
    //         return uint2str(i);
    //     }
    //     return string(abi.encodePacked("0", uint2str(i)));
    // }
    
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
    
    // function fromHexChar(byte c) internal pure returns (uint) {
    //     if (byte(c) >= byte('0') && byte(c) <= byte('9')) {
    //         return uint8(c) - uint8(byte('0'));
    //     }
    //     if (byte(c) >= byte('a') && byte(c) <= byte('f')) {
    //         return 10 + uint8(c) - uint8(byte('a'));
    //     }
    //     if (byte(c) >= byte('A') && byte(c) <= byte('F')) {
    //         return 10 + uint8(c) - uint8(byte('A'));
    //     }
    // }

    // // Convert an hexadecimal string to raw bytes
    // function fromHex(string memory s) public pure returns (uint) {
    //     bytes memory ss = bytes(s);
    //     uint r = 0;
    //     for (uint i = 0; i < ss.length; i++) {
    //         r = r * 16 + fromHexChar(ss[i]);
    //     }
    //     return r;
    // }
    
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
