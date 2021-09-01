//SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "@openzeppelin/contracts/access/AccessControl.sol";

import "./HugoNFTStorage.sol";

// Management for attributes, traits and hashes - all are named as meta-data.
contract HugoNFTMetadataManager is HugoNFTStorage, AccessControl {
    event AddNewAttribute(uint256 indexed newAttributeId, string attributeName, string newScript);
    event AddNewTrait(uint256 indexed attributeId, uint256 indexed traitId, string name, Rarity rarity);
    event UpdateAttributeCID(uint256 indexed attributeId, string ipfsCID);

    /**
     * @dev Adds a new attribute to NFT.
     *
     * Also should be provided attribute's traits, CID of the folder where the traits
     * of the attribute are stored and a new generation script, which can generate NFTs
     * with the added attribute.
     *
     * Emits:
     * 1. {HugoNFTMetadataManager-AddNewAttribute},
     * 2. {HugoNFTMetadataManager-AddNewTrait},
     * 3. {HugoNFTMetadataManager-UpdateAttributeCID}.
     *
     * Requirements:
     * - `attributeName` shouldn't be an empty string
     * - `newGenerationScript` shouldn't be an empty string
     * - `msg.sender` should have {HugoNFTStorage-NFT_ADMIN} role
     * All the other requirements are defined in functions called inside the current one.
     */
    function addNewAttributeWithTraits(
        string calldata attributeName,
        uint256 amountOfTraits,
        string[] calldata names,
        Rarity[] calldata rarities,
        string calldata cid,
        string calldata newGenerationScript
    )
        external
        onlyRole(NFT_ADMIN_ROLE)
    {
        require(bytes(attributeName).length > 0, "HugoNFT::attribute name is empty");
        require(
            bytes(newGenerationScript).length > 0,
            "HugoNFT::empty nft generation script provided"
        );

        uint256 newAttributeId = currentAttributesAmount;
        currentAttributesAmount += 1;

        _attributes[newAttributeId] = Attribute(newAttributeId, attributeName);
        addTraits(newAttributeId, amountOfTraits, names, rarities, cid);
        nftGenerationScripts.push(newGenerationScript);

        emit AddNewAttribute(newAttributeId, attributeName, newGenerationScript);
    }

    /**
     * @dev Updates multiple attribute's CIDs.
     *
     * If for some attribute it wasn't intended to update the CID, then
     * an empty string should be sent as an array member.
     *
     * Emits:
     * 1. {HugoNFTMetadataManager-UpdateAttributeCID}.
     *
     * Requirements:
     * - `CIDs` length should be equal to current (actual) amount of attributes
     * - `msg.sender` should have {HugoNFTStorage-NFT_ADMIN} role
     * All the other requirements are defined in functions called inside the current one.
     */
    function updateMultipleAttributesCIDs(string[] calldata CIDs)
        external
        onlyRole(NFT_ADMIN_ROLE)
    {
        require(
            CIDs.length == currentAttributesAmount,
            "HugoNFT::invalid CIDs array length"
        );
        for (uint256 i = 0; i < CIDs.length; i++) {
            // empty CID string - don't update attributes CID data
            if (bytes(CIDs[i]).length == 0) continue;
            updateAttributeCID(i, CIDs[i]);
        }
    }

    /**
     * @dev The same as {HugoNFTMetadataManager-addTraitWithoutCID}, but updates CID.
     *
     * Trait ids in the attribute's traits data start from id = 1.
     *
     * Emits:
     * 1. {HugoNFTMetadataManager-AddNewTrait},
     * 2. {HugoNFTMetadataManager-UpdateAttributeCID}.
     *
     * Requirements:
     * - `msg.sender` should have {HugoNFTStorage-NFT_ADMIN} role
     * All the other requirements are defined in functions called inside the current one.
     */
    function addTrait(
        uint256 attributeId,
        uint256 traitId,
        string calldata name,
        Rarity rarity,
        string calldata cid
    )
        external
        onlyRole(NFT_ADMIN_ROLE)
    {
        addTraitWithoutCID(attributeId, traitId, name, rarity);
        updateAttributeCID(attributeId, cid);
    }

    /**
     * @dev Adds new traits to the attribute.
     *
     * We don't define trait ids. Instead we define only the number of traits we want
     * to add. Traits are added in a sequential order of their ids. So knowing
     * 1) the amount of traits currently stored for the attribute and 2) amount of traits
     * which is willed to add is enough to compute trait ids for new traits.
     *
     * Emits:
     * 1. {HugoNFTMetadataManager-AddNewTrait},
     * 2. {HugoNFTMetadataManager-UpdateAttributeCID}.
     *
     * Requirements:
     * - `amountOfTraits` shouldn't be more then {HugoNFTStorage-MAX_ADDING_TRAITS}
     * - `amountOfTraits` should be equal to lengths of `names` and `rarities` arrays.
     * - `msg.sender` should have {HugoNFTStorage-NFT_ADMIN} role
     * All the other requirements are defined in functions called inside the current one.
     */
    function addTraits(
        uint256 attributeId,
        uint256 amountOfTraits,
        string[] memory names,
        Rarity[] memory rarities,
        string memory cid
    )
        public
        onlyRole(NFT_ADMIN_ROLE)
    {
        require(
            amountOfTraits <= MAX_ADDING_TRAITS,
            "HugoNFT::adding traits number exceeds prohibited amount"
        );
        require(
            amountOfTraits == names.length && names.length == rarities.length,
            "HugoNFT::unequal lengths of trait inner data arrays"
        );

        uint256 startFromId = _traitsOfAttribute[attributeId].length;
        for (uint256 i = 0; i < amountOfTraits; i++) {
            addTraitWithoutCID(attributeId, startFromId + i + 1, names[i], rarities[i]);
        }
        updateAttributeCID(attributeId, cid);
    }

    /**
     * @dev Updates attribute's CID.
     *
     * Emits:
     * 1. {HugoNFTMetadataManager-UpdateAttributeCID}.
     *
     * Requirements:
     * - `attributeId` should have an id of existent attribute
     * - `ipfsCID` should have a proper length.
     * - `msg.sender` should have {HugoNFTStorage-NFT_ADMIN} role
     */
    function updateAttributeCID(uint256 attributeId, string memory ipfsCID)
        public
        onlyRole(NFT_ADMIN_ROLE)
    {
        require(attributeId < currentAttributesAmount, "HugoNFT::invalid attribute id");
        require(
            bytes(ipfsCID).length == IPFS_CID_BYTES_LENGTH,
            "HugoNFT::invalid ipfs CID length"
        );

        _CIDsOfAttribute[attributeId].push(ipfsCID);

        emit UpdateAttributeCID(attributeId, ipfsCID);
    }

    /**
     * @dev Adds provided trait to the attribute.
     *
     * Trait ids in the attribute's traits data start from id = 1.
     *
     * Emits:
     * 1. {HugoNFTMetadataManager-AddNewTrait}.
     *
     * Requirements:
     * - `attributeId` should have an id of existent attribute
     * - `traitId` should form a sequential order with already stored trait ids.
     * - `name` string shouldn't be empty.
     * - `msg.sender` should have {HugoNFTStorage-NFT_ADMIN} role
     */
    function addTraitWithoutCID(
        uint256 attributeId,
        uint256 traitId,
        string memory name,
        Rarity rarity
    )
        private
        onlyRole(NFT_ADMIN_ROLE)
    {
        require(attributeId < currentAttributesAmount, "HugoNFT::invalid attribute id");
        // This kind of check has 2 pros:
        // 1. could check whether the id is valid by comparing it with array length
        // 2. trait id also tells about its position in Traits[]
        // But there is a con: we should add traits sequentially
        Trait[] storage tA = _traitsOfAttribute[attributeId];
        require(
            tA.length + 1 == traitId,
            "HugoNFT::traits should be added sequentially by trait ids"
        );
        require(bytes(name).length > 0, "HugoNFT::empty trait name");

        Trait memory newTrait = Trait(attributeId, traitId, name, rarity);
        tA.push(newTrait);

        emit AddNewTrait(attributeId, traitId, name, rarity);
    }
}