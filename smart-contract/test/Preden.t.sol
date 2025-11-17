// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "../src/Preden.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 token for testing
contract MockToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract PredenTest is Test {
    Preden public platform;
    
    MockToken public betToken;
    
    address public admin = address(0x1);
    address public moderator = address(0x2);
    address public user1 = address(0x3);
    address public user2 = address(0x4);
    
    uint256 public constant CREATOR_STAKE = 100 * 10**18;
    uint256 public constant BET_AMOUNT = 10 * 10**18;
    
    // Event parameters
    string public question = "Who will win the championship?";
    string public description = "Betting on the championship winner";
    string[] public options = ["Team A", "Team B", "Team C"];
    string public eventType = "Sports";
    uint256 public categoryId = 0;
    string public eventImage = "cx10jeejw";
    uint256 public endTime;
    
    function setUp() public {
        vm.startPrank(admin);
        
        // Deploy mock tokens
        betToken = new MockToken("Bet Token", "BET");
        
        // Deploy platform
        platform = new Preden(500);
        
        // Add allowed token
        platform.addToken(address(betToken));
        
        // Grant moderator role
        platform.grantRole(platform.MODERATOR_ROLE(), moderator);
        
        // Distribute tokens to users
        betToken.transfer(user1, 1000 * 10**18);
        betToken.transfer(user2, 1000 * 10**18);
        
        // Set event times
        endTime = block.timestamp + 2 days;
        
        vm.stopPrank();
    }
    
    function test_CreateEvent() public {
        vm.startPrank(user1);
        
        // Create event
        address eventAddr = platform.createEvent(
            question,
            description,
            options,
            eventType,
            categoryId,
            eventImage,
            endTime,
            address(betToken)
        );
        
        // Check event was created
        assertEq(platform.getEventsCount(), 1);
        assertEq(platform.events(0), eventAddr);
        
        // Check event details
        EventContract event_ = EventContract(eventAddr);
        (
            string memory q,
            string memory desc,
            string[] memory opts,
            ,
            ,
            ,
            EventContract.EventStatus status,
            uint256 end,
            uint8 winningOption,
            address creator,
            address tokenAddress,
            uint256 totalStaked,
        ,
        
        ) = event_.getEventDetails();
        
        assertEq(q, question);
        assertEq(desc, description);
        assertEq(opts.length, options.length);
        assertEq(uint(status), uint(EventContract.EventStatus.Pending));
        assertEq(end, endTime);
        assertEq(winningOption, 255);
        assertEq(creator, user1);
        assertEq(tokenAddress, address(betToken));
        assertEq(totalStaked, 0);
        
        vm.stopPrank();
    }
    
    function test_AdminCreateEvent() public {
        vm.startPrank(admin);
        
        // Admin creates event (no stake required)
        address eventAddr = platform.createEvent(
            question,
            description,
            options,
            eventType,
            categoryId,
            eventImage,
            endTime,
            address(betToken)
        );

        // Check event status is automatically approved
        EventContract event_ = EventContract(eventAddr);
        (,,,,,, EventContract.EventStatus status,,,,,,,) = event_.getEventDetails();
        
        assertEq(uint(status), uint(EventContract.EventStatus.Approved));
        
        // vm.stopPrank();
    }
    
    function test_EventApproval() public {
        // User creates event
        vm.startPrank(user1);
        
        address eventAddr = platform.createEvent(
            question, description, options, eventType, categoryId, 
            eventImage, endTime, address(betToken)
        );
        vm.stopPrank();
        
        // Moderator approves event
        vm.startPrank(moderator);
        platform.approveEvent(eventAddr);
        vm.stopPrank();
        
        // Check event status
        EventContract event_ = EventContract(eventAddr);
        (,,,,,, EventContract.EventStatus status,,,,,,,) = event_.getEventDetails();
        assertEq(uint(status), uint(EventContract.EventStatus.Approved));
    }
    
    function test_EventRejection() public {
        // User creates event
        vm.startPrank(user1);
        address eventAddr = platform.createEvent(
            question, description, options, eventType, categoryId, 
            eventImage, endTime, address(betToken)
        );
        vm.stopPrank();
        
        // Moderator rejects event
        vm.startPrank(moderator);
        platform.rejectEvent(eventAddr);
        vm.stopPrank();
        
        // Check event status
        EventContract event_ = EventContract(eventAddr);
        (,,,,,, EventContract.EventStatus status,,,,,,,) = event_.getEventDetails();
        assertEq(uint(status), uint(EventContract.EventStatus.Rejected));
    }
    
    function test_EventCancellation() public {
        // User creates event
        vm.startPrank(user1);
        address eventAddr = platform.createEvent(
            question, description, options, eventType, categoryId, 
            eventImage, endTime, address(betToken)
        );
        
        // User cancels their own event
        platform.cancelEvent(eventAddr);
        vm.stopPrank();
        
        // Check event status
        EventContract event_ = EventContract(eventAddr);
        (,,,,,, EventContract.EventStatus status,,,,,,,) = event_.getEventDetails();
        assertEq(uint(status), uint(EventContract.EventStatus.Cancelled));
    }
    
    function test_EventStaking() public {
        // Admin creates and approves event
        vm.startPrank(admin);
        address eventAddr = platform.createEvent(
            question, description, options, eventType, categoryId, 
            eventImage, endTime, address(betToken)
        );
        vm.stopPrank();

        vm.startPrank(address(platform));
        EventContract(eventAddr).updateEventStatus(EventContract.EventStatus.Approved);
        vm.stopPrank();
        
        // User1 places stake on option 0
        vm.startPrank(user1);
        betToken.approve(eventAddr, BET_AMOUNT);
        EventContract(eventAddr).stake(0, BET_AMOUNT);
        vm.stopPrank();
        
        // User2 places stake on option 1
        vm.startPrank(user2);
        betToken.approve(eventAddr, BET_AMOUNT * 2);
        EventContract(eventAddr).stake(1, BET_AMOUNT * 2);
        vm.stopPrank();
        
        // Check event stakes
        EventContract event_ = EventContract(eventAddr);
        (,,,,,,,,,,, uint256 totalStaked,,) = event_.getEventDetails();
        
        assertEq(totalStaked, BET_AMOUNT * 3);
        
        // Check option totals
        uint256[] memory optionTotals = event_.getOptionTotals();
        assertEq(optionTotals[0], BET_AMOUNT);
        assertEq(optionTotals[1], BET_AMOUNT * 2);
        
        // Check user stakes
        (uint8 option1, uint256 amount1, bool claimed1) = event_.getUserStake(user1);
        (uint8 option2, uint256 amount2, bool claimed2) = event_.getUserStake(user2);
        
        assertEq(option1, 0);
        assertEq(amount1, BET_AMOUNT);
        assertEq(claimed1, false);
        
        assertEq(option2, 1);
        assertEq(amount2, BET_AMOUNT * 2);
        assertEq(claimed2, false);
    }
    
    function test_EventCompletion() public {
        // Setup event with stakes
        vm.startPrank(admin);
        address eventAddr = platform.createEvent(
            question, description, options, eventType, categoryId, 
            eventImage, endTime, address(betToken)
        );
        vm.stopPrank();

        vm.startPrank(address(platform));
        EventContract(eventAddr).updateEventStatus(EventContract.EventStatus.Approved);
        vm.stopPrank();
        
        vm.startPrank(user1);
        betToken.approve(eventAddr, BET_AMOUNT);
        EventContract(eventAddr).stake(0, BET_AMOUNT);
        vm.stopPrank();
        
        vm.startPrank(user2);
        betToken.approve(eventAddr, BET_AMOUNT * 2);
        EventContract(eventAddr).stake(1, BET_AMOUNT * 2);
        vm.stopPrank();
        
        // Warp to after end time
        vm.warp(endTime + 1);
        
        // Moderator completes event with option 0 as winner
        vm.startPrank(moderator);
        platform.completeEvent(eventAddr, 0);
        vm.stopPrank();
        
        // Check event status
        EventContract event_ = EventContract(eventAddr);
        (,,,,,, EventContract.EventStatus status,, uint8 winningOption,,,,,) = event_.getEventDetails();
        
        assertEq(uint(status), uint(EventContract.EventStatus.Completed));
        assertEq(winningOption, 0);
    }
    
    function test_RewardClaiming() public {
        // Setup completed event with stakes
        vm.startPrank(admin);
        address eventAddr = platform.createEvent(
            question, description, options, eventType, categoryId, 
            eventImage, endTime, address(betToken)
        );
        vm.stopPrank();

        vm.startPrank(address(platform));
        EventContract(eventAddr).updateEventStatus(EventContract.EventStatus.Approved);
        vm.stopPrank();
        
        vm.startPrank(user1);
        betToken.approve(eventAddr, BET_AMOUNT);
        EventContract(eventAddr).stake(0, BET_AMOUNT);
        vm.stopPrank();
        
        vm.startPrank(user2);
        betToken.approve(eventAddr, BET_AMOUNT * 2);
        EventContract(eventAddr).stake(1, BET_AMOUNT * 2);
        vm.stopPrank();
        
        // Warp to after end time
        vm.warp(endTime + 1);
        
        // Moderator completes event with option 0 as winner
        vm.startPrank(moderator);
        platform.completeEvent(eventAddr, 0);
        vm.stopPrank();
        
        // Get user1's balance before claiming
        uint256 user1BalanceBefore = betToken.balanceOf(user1);
        
        // User1 claims reward
        vm.startPrank(user1);
        EventContract(eventAddr).claimReward();
        vm.stopPrank();
        
        // Check user1's balance after claiming
        uint256 user1BalanceAfter = betToken.balanceOf(user1);
        assertEq(user1BalanceAfter, user1BalanceBefore + BET_AMOUNT * 3);
        
        // Check user stake is marked as claimed
        (,, bool claimed) = EventContract(eventAddr).getUserStake(user1);
        assertTrue(claimed);
    }
    
    function test_CannotClaimIfNotWinner() public {
        // Setup completed event with stakes
        vm.startPrank(admin);
        address eventAddr = platform.createEvent(
            question, description, options, eventType, categoryId, 
            eventImage, endTime, address(betToken)
        );
        vm.stopPrank();

        vm.startPrank(address(platform));
        EventContract(eventAddr).updateEventStatus(EventContract.EventStatus.Approved);
        vm.stopPrank();
        
        vm.startPrank(user1);
        betToken.approve(eventAddr, BET_AMOUNT);
        EventContract(eventAddr).stake(0, BET_AMOUNT);
        vm.stopPrank();
        
        vm.startPrank(user2);
        betToken.approve(eventAddr, BET_AMOUNT);
        EventContract(eventAddr).stake(1, BET_AMOUNT);
        vm.stopPrank();
        
        // Warp to after end time
        vm.warp(endTime + 1);
        
        // Moderator completes event with option 0 as winner
        vm.startPrank(moderator);
        platform.completeEvent(eventAddr, 0);
        vm.stopPrank();
        
        // User2 tries to claim reward (should fail)
        vm.startPrank(user2);
        vm.expectRevert("Did not bet on winning option");
        EventContract(eventAddr).claimReward();
        vm.stopPrank();
    }
    
    function test_Category() public {
        vm.startPrank(admin);
        
        // Add new category
        string memory newCatName = "Sports";
        string memory newCatDesc = "Sports betting category";
        platform.addCategory(newCatName, newCatDesc);
        
        // Check category count
        assertEq(platform.getCategoriesCount(), 2);
        
        // Check category details
        (string memory name, string memory _description, bool active) = platform.categories(1);
        assertEq(name, newCatName);
        assertEq(_description, newCatDesc);
        assertTrue(active);
        
        // Update category
        platform.updateCategory(1, "eSports", "eSports betting category", true);
        
        // Check updated category
        (name, _description, active) = platform.categories(1);
        assertEq(name, "eSports");
        assertEq(_description, "eSports betting category");
        assertTrue(active);
        
        vm.stopPrank();
    }
    
    function test_Token() public {
        vm.startPrank(admin);
        
        // Check initial token
        assertEq(platform.getAllowedTokensCount(), 1);
        assertTrue(platform.isTokenAllowed(address(betToken)));
        
        // Add new token
        MockToken newToken = new MockToken("New Token", "NEW");
        platform.addToken(address(newToken));
        
        // Check token count
        assertEq(platform.getAllowedTokensCount(), 2);
        assertTrue(platform.isTokenAllowed(address(newToken)));
        
        // Remove token
        platform.removeToken(address(newToken));
        
        // Check token was removed
        assertEq(platform.getAllowedTokensCount(), 1);
        assertFalse(platform.isTokenAllowed(address(newToken)));
        
        vm.stopPrank();
    }
    
    function test_EventActivation() public {
        // User creates event
        vm.startPrank(user1);
        
        address eventAddr = platform.createEvent(
            question, description, options, eventType, categoryId, 
            eventImage, endTime, address(betToken)
        );
        vm.stopPrank();
        
        // Moderator approves event
        vm.startPrank(moderator);
        platform.approveEvent(eventAddr);
        vm.stopPrank();
        
        // Check event status
        EventContract event_ = EventContract(eventAddr);
        (,,,,,, EventContract.EventStatus status,,,,,,,) = event_.getEventDetails();
        assertEq(uint(status), uint(EventContract.EventStatus.Approved));
    }
    
    function test_EventQueries() public {
        // Create multiple events
        vm.startPrank(admin);
        
        // Add a new category
        platform.addCategory("Sports", "Sports betting");
        
        // Create events with different categories
        address event1 = platform.createEvent(
            "Question 1", "Desc 1", options, "Type1", 0, "img1", 
            endTime, address(betToken)
        );
        
        address event2 = platform.createEvent(
            "Question 2", "Desc 2", options, "Type2", 1, "img2", 
            endTime, address(betToken)
        );
        
        vm.stopPrank();
        
        // User creates an event
        vm.startPrank(user1);
        
        address event3 = platform.createEvent(
            "Question 3", "Desc 3", options, "Type3", 0, "img3", 
            endTime, address(betToken)
        );
        vm.stopPrank();
        
        // Check getEventsByStatus
        address[] memory activeEvents = platform.getEventsByStatus(EventContract.EventStatus.Approved);
        address[] memory pendingEvents = platform.getEventsByStatus(EventContract.EventStatus.Pending);
        
        assertEq(activeEvents.length, 2);
        assertEq(activeEvents[0], event1);
        assertEq(pendingEvents.length, 1);
        assertEq(pendingEvents[0], event3);
        
        // Check getEventsByCategory
        address[] memory cat0Events = platform.getEventsByCategory(0);
        address[] memory cat1Events = platform.getEventsByCategory(1);
        
        assertEq(cat0Events.length, 2);
        assertEq(cat1Events.length, 1);
        assertEq(cat1Events[0], event2);
        
        // Check getEventsByCreator
        address[] memory adminEvents = platform.getEventsByCreator(admin);
        address[] memory user1Events = platform.getEventsByCreator(user1);
        
        assertEq(adminEvents.length, 2);
        assertEq(user1Events.length, 1);
        assertEq(user1Events[0], event3);
    }
    
    function test_AdditionalStakeToSameOption() public {
        // Admin creates event
        vm.startPrank(admin);
        address eventAddr = platform.createEvent(
            question, description, options, eventType, categoryId, 
            eventImage, endTime, address(betToken)
        );
        // platform.approveEvent(eventAddr);
        vm.stopPrank();

        vm.startPrank(address(platform));
        EventContract(eventAddr).updateEventStatus(EventContract.EventStatus.Approved);
        vm.stopPrank();
        
        // User1 places stake on option 0
        vm.startPrank(user1);
        betToken.approve(eventAddr, BET_AMOUNT * 2);
        
        // First stake
        EventContract(eventAddr).stake(0, BET_AMOUNT);
        
        // Additional stake to same option
        EventContract(eventAddr).stake(0, BET_AMOUNT);
        vm.stopPrank();
        
        // Check user stake
        (uint8 option, uint256 amount, ) = EventContract(eventAddr).getUserStake(user1);
        assertEq(option, 0);
        assertEq(amount, BET_AMOUNT * 2);
    }
    
    function test_RevertWhen_CannotStakeOnDifferentOption() public {
        // Admin creates event
        vm.startPrank(admin);
        address eventAddr = platform.createEvent(
            question, description, options, eventType, categoryId, 
            eventImage, endTime, address(betToken)
        );
        vm.stopPrank();
        
        // User1 places stake on option 0
        vm.startPrank(user1);
        betToken.approve(eventAddr, BET_AMOUNT * 2);
        EventContract(eventAddr).stake(0, BET_AMOUNT);
        
        // Try to stake on a different option (should fail)
        EventContract(eventAddr).stake(1, BET_AMOUNT);
        vm.stopPrank();
    }

    function test_RevertWhen_CannotStakeAfterEndTime() public {
        // Admin creates event
        vm.startPrank(admin);
        address eventAddr = platform.createEvent(
            question, description, options, eventType, categoryId, 
            eventImage, endTime, address(betToken)
        );
        vm.stopPrank();
        
        // Warp to after end time
        vm.warp(endTime + 1);
        
        // Try to stake (should fail)
        vm.startPrank(user1);
        betToken.approve(eventAddr, BET_AMOUNT);
        EventContract(eventAddr).stake(0, BET_AMOUNT);
        vm.stopPrank();
    }

    function test_RevertWhen_CannotSetInvalidWinningOption() public {
        // Setup event
        vm.startPrank(admin);
        address eventAddr = platform.createEvent(
            question, description, options, eventType, categoryId, 
            eventImage, endTime, address(betToken)
        );
        vm.stopPrank();
        
        // Warp to after end time
        vm.warp(endTime + 1);
        
        // Try to set invalid winning option
        vm.startPrank(moderator);
        platform.completeEvent(eventAddr, 255);
        vm.stopPrank();
    }

    function test_RevertIf_UnauthorizedEventCancellation() public {
        // User1 creates event
        vm.startPrank(user1);
        
        address eventAddr = platform.createEvent(
            question, description, options, eventType, categoryId, 
            eventImage, endTime, address(betToken)
        );
        vm.stopPrank();
        
        // User2 tries to cancel User1's event (should fail)
        vm.startPrank(user2);
        vm.expectRevert("Not authorized");
        platform.cancelEvent(eventAddr);
        vm.stopPrank();
    }

    function test_RevertWhen_CannotCancelActiveEventWithStakes() public {
        // Admin creates event
        vm.startPrank(admin);
        address eventAddr = platform.createEvent(
            question, description, options, eventType, categoryId, 
            eventImage, endTime, address(betToken)
        );
        vm.stopPrank();
        
        // User1 places stake
        vm.startPrank(user1);
        betToken.approve(eventAddr, BET_AMOUNT);
        EventContract(eventAddr).stake(0, BET_AMOUNT);
        vm.stopPrank();
        
        // Admin tries to cancel event with stakes (should fail)
        vm.startPrank(admin);
        platform.cancelEvent(eventAddr);
        vm.stopPrank();
    }
}