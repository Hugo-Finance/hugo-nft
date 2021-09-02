//SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./HugoNFTMinter.sol";

/** TODO
1. discussions
*/

/**
 * @author SabaunT https://github.com/SabaunT.
 * @dev The main contract which inherits minting and metadata management logic.
 *
 * This contract is mainly "focused" on view functions.
 */
contract HugoNFT is HugoNFTMinter {
    using Strings for uint256;

    // todo discuss Deploying with 25 traits and 5 attributes requires gas usage of ~20000000
    // todo discuss emitting events in constructor
    constructor(
        string memory baseTokenURI,
        uint256 initialAmountOfAttributes,
        string memory script,
        // attributes and traits params
        uint256[] memory traitAmountForEachAttribute,
        string[][] memory traitNamesForEachAttribute,
        Rarity[][] memory raritiesForEachAttribute,
        string[] memory CIDsForEachAttribute,
        string[] memory attributesNames
    )
        ERC721("HugoNFT", "HUGO")
    {
        require(bytes(baseTokenURI).length > 0, "HugoNFT::empty new URI string provided");
        require(initialAmountOfAttributes > 0, "HugoNFT::initial attributes amount is 0");
        require(bytes(script).length > 0,"HugoNFT::empty nft generation script provided");
        require(
            (initialAmountOfAttributes == traitAmountForEachAttribute.length) &&
            (initialAmountOfAttributes == traitNamesForEachAttribute.length) &&
            (initialAmountOfAttributes == raritiesForEachAttribute.length) &&
            (initialAmountOfAttributes == CIDsForEachAttribute.length) &&
            (initialAmountOfAttributes == attributesNames.length),
            "HugoNFT::disproportion in provided attributes and traits data"
        );

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(NFT_ADMIN_ROLE, _msgSender());

        _baseTokenURI = baseTokenURI;
        minAttributesAmount = initialAmountOfAttributes;
        currentAttributesAmount = initialAmountOfAttributes;
        nftGenerationScripts.push(script);

        for (uint256 i = 0; i < initialAmountOfAttributes; i++) {
            require(
                bytes(attributesNames[i]).length > 0,
                "HugoNFT::empty attribute name"
            );
            _attributes[i] = Attribute(i, attributesNames[i]);
        }

        // Very important to set them in constructor,
        // because otherwise contract should be paused until all
        // attributes have their traits set
        for (uint256 i = 0; i < initialAmountOfAttributes; i++) {
            addTraits(
                i,
                traitAmountForEachAttribute[i],
                traitNamesForEachAttribute[i],
                raritiesForEachAttribute[i],
                CIDsForEachAttribute[i]
            );
        }
    }

    /**
     * @dev Sets a new token URI
     *
     * Requirements:
     * - `newURI` shouldn't be the same as the previous one, shouldn't be empty string.
     */
    function setTokenURI(string calldata newURI) external onlyRole(NFT_ADMIN_ROLE) {
        require(bytes(newURI).length > 0, "HugoNFT::empty new URI string provided");
        require(
            keccak256(abi.encodePacked(newURI)) != keccak256(abi.encodePacked(_baseTokenURI)),
            "HugoNFT::can't set same token URI"
        );

        _baseTokenURI = newURI;
    }

    /**
     * @dev Returns a {HugoNFTTypes-Attribute} struct with data for `attributeId`.
     */
    function getAttributeData(uint256 attributeId)
        external
        view
        returns (Attribute memory)
    {
        require(attributeId < currentAttributesAmount, "HugoNFT::invalid attribute id");
        return _attributes[attributeId];
    }

    /**
     * @dev Gets script actual for `attributesNum` number of attributes
     *
     * It is always better to request the latest version of the script, because
     * it can work with all the attributes. Anyway, the requested script should work
     * for at least `x+1` attributes, where `x` is the index of the last non-zero
     * trait id in the seed.
     * So, for a seed [1,1,1,2,2,0,0,3,0,0] you should request script for at least
     * 8 attributes.
     *
     * Requirements:
     * - `attributesNum` is gte `minAttributesAmount` and lte `currentAttributesAmount`
     *
     * Returns a utf-8 string of the script
     */
    function getGenerationScriptForAttributesNum(uint256 attributesNum)
        external
        view
        returns (string memory)
    {
        require(
            attributesNum >= minAttributesAmount &&
            attributesNum <= currentAttributesAmount,
            "HugoNFT::script for invalid num of attributes requested"
        );
        return nftGenerationScripts[attributesNum - minAttributesAmount];
    }

    /**
     * @dev Returns an amount of auto-generated NFTs already minted.
     */
    function generatedNFTsAmount() external view returns (uint256) {
        return _getGeneratedHugoAmount();
    }

    /**
     * @dev Gets CIDs array for an `attributeId`
     *
     * Requirements:
     * - `attributeId` belongs to interval [0; currentAttributesAmount)
     *
     * Returns an array of utf-8 IPFS CID strings
     */
    function getCIDsOfAttribute(uint256 attributeId)
        external
        view
        returns (string[] memory)
    {
        require(attributeId < currentAttributesAmount, "HugoNFT::invalid attribute id");
        return _CIDsOfAttribute[attributeId];
    }

    /**
     * @dev Gets traits array for an `attributeId`
     *
     * Requirements:
     * - `attributeId` belongs to interval [0; currentAttributesAmount)
     *
     * Returns an array of {HugoNFTType-Trait}s
     */
    function getTraitsOfAttribute(uint256 attributeId)
        external
        view
        returns (Trait[] memory)
    {
        require(attributeId < currentAttributesAmount, "HugoNFT::invalid attribute id");
        return _traitsOfAttribute[attributeId];
    }

    /**
     * @dev Gets traits array for an `attributeId` with requested `rarity`
     *
     * We don't know the amount of such traits in advance, so we have to initialize
     * a max array for such traits. Obviously, it's O(_traitsOfAttribute[attributeId].length).
     *
     * After we found all such traits we put them into returning array with a proper length.
     *
     * Requirements:
     * - `attributeId` belongs to interval [0; currentAttributesAmount)
     *
     * Returns an array of {HugoNFTType-Trait}s with the requested `rarity`
     */
    function getTraitsWithRarityByAttribute(uint256 attributeId, Rarity rarity)
        external
        view
        returns (Trait[] memory)
    {
        require(attributeId < currentAttributesAmount, "HugoNFT::invalid attribute id");

        Trait[] storage tOA = _traitsOfAttribute[attributeId];

        uint256 foundTraitsWithRequestedRarity = 0;
        // Needs to compute position of the needed trait in tmp array,
        // so the first found trait will be placed at the 0 index, not at the current i.
        uint256 misses = 0;
        Trait[] memory tmp = new Trait[](tOA.length);
        for (uint256 i = 0; i < tOA.length; i++) {
            if (tOA[i].rarity == rarity) {
                tmp[i - misses] = tOA[i];
                foundTraitsWithRequestedRarity += 1;
            } else {
                misses += 1;
            }
        }

        // Filling all found traits in array with the proper length
        // The same as getting rif of empty Trait structs on the right
        Trait[] memory ret = new Trait[](foundTraitsWithRequestedRarity);
        for (uint256 i = 0; i < foundTraitsWithRequestedRarity; i++) {
            ret[i] = tmp[i];
        }
        return ret;
    }

    /**
     * @dev Returns an array of token ids owned by `account`.
     */
    function tokenIdsOfOwner(address account)
        external
        view
        returns (uint256[] memory)
    {
        return _tokenIdsOfAccount[account];
    }

    /**
     * @dev Checks whether the provided `seed` is used.
     *
     * For more info concerning logic and requirements read {HugoNFTMinter-_isValidSeed}
     *
     * Returns true if `seed` is used, otherwise - false.
     */
    function isUsedSeed(uint256[] calldata seed) external view returns (bool) {
        require(_isValidSeed(seed), "HugoNFT::an invalid seed was provided");
        return _isUsedSeed[_getSeedHash(seed)];
    }

    // Returns array of {HugoNFTType-NFT} structs, which have requested token ids.
    function getNFTs(uint256[] calldata tokenIds) external view returns (NFT[] memory) {
        NFT[] memory ret = new NFT[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            ret[i] = getNFT(tokenId);
        }
        return ret;
    }

    /**
     * @dev Gets NFT with `tokenId`
     *
     * If it exists and it has an id in interval [0; 10000), then its seed will be
     * standardized. For more info read {HugoNFT-_standardizeSeed}.
     *
     * If NFT doesn't exist, returns empty, zero initialized {HugoNFTType-NFT} struct.
     *
     * Returns a {HugoNFTType-NFT} struct with the `tokenId`
     */
    function getNFT(uint256 tokenId)
        public
        view
        returns (NFT memory)
    {
        NFT memory retNFT;
        if (_tokenExists(tokenId)) {
            retNFT = _NFTs[tokenId];
            if (_isIdOfGeneratedNFT(tokenId)) {
                retNFT.seed = _standardizeSeed(retNFT.seed);
            }
        } else {
            // default NFT
            retNFT = NFT(0, "", "", new uint256[](0), "", 0);
        }
        return retNFT;
    }

    /**
     * @dev Gets IPFS path to `traitId` of `attributeId`
     *
     * Requirements:
     * - `attributeId` belongs to interval [0; currentAttributesAmount)
     * - `traitId` should be present in array of traits for an attribute. Also
     * it shouldn't be equal to 0, because 0 is reserved trait id for non-existent
     * attribute in seed.
     *
     * Returns a utf-8 string of IPFS path to the requested trait.
     */
    function traitIpfsPath(uint256 attributeId, uint256 traitId)
        external
        view
        returns (string memory)
    {
        require(attributeId < currentAttributesAmount, "HugoNFT::invalid attribute id");
        require(
            traitId != 0,
            "HugoNFT::0 trait id is reserved for 'no attribute' in seed"
        );
        require(
            traitId <= _traitsOfAttribute[attributeId].length,
            "HugoNFT::trait id doesn't exist for the attribute"
        );

        string[] memory lastCIDs = validCIDs();
        string memory attributeCID = lastCIDs[attributeId];
        return string(abi.encodePacked("ipfs://", attributeCID, "/", traitId.toString()));
    }

    /**
     * @dev Gets valid CIDs for all the attributes
     *
     * Returns last CIDs from the attributes CIDs arrays
     */
    function validCIDs() public view returns (string[] memory) {
        string[] memory retCIDs = new string[](currentAttributesAmount);
        for (uint256 i = 0; i < currentAttributesAmount; i++) {
            string[] storage aCIDs = _CIDsOfAttribute[i];
            // Length 0 is impossible, because from the deployment
            // NFT has CIDs for its attributes
            string storage lastCID = aCIDs[aCIDs.length - 1];
            retCIDs[i] = lastCID;
        }
        return retCIDs;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @dev For a `seed` with a valid attributes amount different from `currentAttributesAmount`
     * return a new one, which will have a `currentAttributesAmount` number of attributes
     * but trait ids for added attributes will be zeros.
     *
     * For example, `currentAttributesAmount` = 8. Then:
     * 1. _standardizeSeed([1,2,3,4,5]) -> [1,2,3,4,5,0,0,0]
     * 2. _standardizeSeed([1,2,3,4,5,0,1]) -> [1,2,3,4,5,0,1,0]
     *
     * Returns a seed with amount of `currentAttributesAmount` attributes, but unchanged
     * trait ids.
     */
    function _standardizeSeed(uint256[] memory seed)
        private
        view
        returns (uint256[] memory)
    {
        if (seed.length == currentAttributesAmount) return seed;
        uint256[] memory standardizedSeed = new uint256[](currentAttributesAmount);
        for (uint256 i = 0; i < currentAttributesAmount; i++) {
            standardizedSeed[i] = i > seed.length - 1 ? 0 : seed[i];
        }
        return standardizedSeed;
    }
}