// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TaskEscrow {
    enum State { Funded, Assigned, Completed, Failed, Disputed }

    struct Task {
        address creator;
        address assignee;
        uint256 amount;
        State   state;
    }

    mapping(bytes32 => Task) public tasks;
    address public registry;

    event TaskFunded(bytes32 indexed id, uint256 amount);
    event TaskAssigned(bytes32 indexed id, address assignee);
    event TaskSettled(bytes32 indexed id, bool completed, address recipient, uint256 amount);
    event TaskDisputed(bytes32 indexed id);

    constructor(address _registry) {
        registry = _registry;
    }

    modifier onlyRegistry() {
        require(msg.sender == registry, "unauthorized");
        _;
    }

    function fundTask(bytes32 taskId) external payable {
        require(tasks[taskId].amount == 0, "already funded");
        require(msg.value > 0, "amount required");
        tasks[taskId] = Task(msg.sender, address(0), msg.value, State.Funded);
        emit TaskFunded(taskId, msg.value);
    }

    function assignTask(bytes32 taskId, address assignee) external onlyRegistry {
        require(tasks[taskId].state == State.Funded, "must be funded");
        tasks[taskId].assignee = assignee;
        tasks[taskId].state = State.Assigned;
        emit TaskAssigned(taskId, assignee);
    }

    function completeTask(bytes32 taskId) external onlyRegistry {
        Task storage t = tasks[taskId];
        require(t.state == State.Assigned || t.state == State.Disputed, "invalid state");
        uint256 amt = t.amount;
        t.amount = 0;
        t.state = State.Completed;
        (bool ok,) = t.assignee.call{value: amt}("");
        require(ok, "payment failed");
        emit TaskSettled(taskId, true, t.assignee, amt);
    }

    function failTask(bytes32 taskId) external onlyRegistry {
        Task storage t = tasks[taskId];
        require(t.state == State.Assigned || t.state == State.Disputed, "invalid state");
        uint256 amt = t.amount;
        t.amount = 0;
        t.state = State.Failed;
        (bool ok,) = t.creator.call{value: amt}("");
        require(ok, "refund failed");
        emit TaskSettled(taskId, false, t.creator, amt);
    }

    function disputeTask(bytes32 taskId) external {
        require(tasks[taskId].state == State.Assigned, "can only dispute assigned");
        tasks[taskId].state = State.Disputed;
        emit TaskDisputed(taskId);
    }
}
