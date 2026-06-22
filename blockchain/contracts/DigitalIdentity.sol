// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DigitalIdentity {

    struct Identity {
        address user;
        string documentHash;
        uint256 timestamp;
    }

    Identity[] public identities;

    event IdentityStored(address indexed user, string documentHash, uint256 timestamp);

    function storeIdentity(string memory _documentHash) public {
        identities.push(Identity(msg.sender, _documentHash, block.timestamp));
        emit IdentityStored(msg.sender, _documentHash, block.timestamp);
    }

    function getTotalIdentities() public view returns (uint256) {
        return identities.length;
    }
}
