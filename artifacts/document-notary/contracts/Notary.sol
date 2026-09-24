// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Notary {
    struct Document {
        address owner;
        uint256 timestamp;
        string description;
        string ipfsCID;
    }

    mapping(bytes32 => Document) public documents;

    event DocumentNotarized(
        bytes32 indexed docHash,
        address indexed owner,
        uint256 timestamp,
        string description,
        string ipfsCID
    );

    event OwnershipTransferred(
        bytes32 indexed docHash,
        address indexed oldOwner,
        address indexed newOwner
    );

    function notarize(
        bytes32 docHash,
        string memory description,
        string memory ipfsCID
    ) external {
        require(documents[docHash].owner == address(0), "Document already notarized");

        uint256 timestamp = block.timestamp;
        documents[docHash] = Document({
            owner: msg.sender,
            timestamp: timestamp,
            description: description,
            ipfsCID: ipfsCID
        });

        emit DocumentNotarized(
            docHash,
            msg.sender,
            timestamp,
            description,
            ipfsCID
        );
    }

    function verify(bytes32 docHash) external view returns (bool) {
        return documents[docHash].owner != address(0);
    }

    function getNotarization(bytes32 docHash)
        external
        view
        returns (Document memory)
    {
        return documents[docHash];
    }

    function transferOwnership(bytes32 docHash, address newOwner) external {
        require(newOwner != address(0), "New owner is zero address");
        Document storage document = documents[docHash];
        require(document.owner != address(0), "Document does not exist");
        require(document.owner == msg.sender, "Not document owner");

        address oldOwner = document.owner;
        document.owner = newOwner;
        emit OwnershipTransferred(docHash, oldOwner, newOwner);
    }
}