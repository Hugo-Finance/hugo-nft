const HugoNFT = artifacts.require("HugoNFT");
const { BN } = require('@openzeppelin/test-helpers');

contract('HugoNFT', async(accounts) => {
    function range(size, startAt = 0) {
        return [...Array(size).keys()].map(i => i + startAt);
    }

    async function getTokenIdsOfAccount(account) {
        let retIds = [];
        let idsBN = await nftContract.tokenIdsOfOwner.call(account);
        idsBN.forEach(bnNum => retIds.push(bnNum.toNumber()));
        return retIds;
    }

    function assertEqArrays(expected, actual) {
        expect(expected).to.deep.eq(actual)
    }

    let expectThrow = async (promise) => {
        try {
            await promise;
        } catch (error) {
            const invalidOpcode = error.message.search('invalid opcode') >= 0;
            const outOfGas = error.message.search('out of gas') >= 0;
            const revert = error.message.search('revert') >= 0;
            assert(
                invalidOpcode || outOfGas || revert,
                "Expected throw, got '" + error + "' instead",
            );
          return;
        }
        assert.fail('Expected throw not received');
    };

    const account1 = accounts[0];
    const account2 = accounts[1];
    const account3 = accounts[2];
    const account4 = accounts[3];
    const nft_admin = accounts[4];
    const minter = accounts[5];
    const owner = accounts[6];

    const HEAD_ID = 0;
    const GLASSES_ID = 1;
    const BODY_ID = 2;
    const SHIRT_ID = 3;
    const SCARF_ID = 4;
    const EYE_ID = 5;
    const BACKGROUND_ID = 6;

    const CORE_ATTRIBUTES = ["head", "glasses", "body", "shirt", "scarf"];

    const tokenURI = "someURI";
    const versionOneAttributesAmount = 5;
    const versionTwoAttributesAmount = 6;
    const versionThreeAttributesAmount = 7;

    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const exampleCID1 = "QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR";
    const exampleCID2 = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

    const NFT_ADMIN_ROLE = "0xd4dd364b99254967de7b77fa79c0f7835d1d5ebdb779edee0c386bda7d2cc482";
    const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6"

    let nftContract;

    before("Deploying and configurating NFT contract", async() => {
        // empty URI string
        await expectThrow(
            HugoNFT.new(
                "",
                versionOneAttributesAmount,
                "some python script",
                Array(versionOneAttributesAmount).fill(4),
                Array(versionOneAttributesAmount).fill(Array(4).fill("aaaa")),
                Array(versionOneAttributesAmount).fill(exampleCID1),
                CORE_ATTRIBUTES,
                {from: owner})
        )
        // zero attributes amount
        await expectThrow(
            HugoNFT.new(
                tokenURI,
                0,
                "some python script",
                Array(versionOneAttributesAmount).fill(4),
                Array(versionOneAttributesAmount).fill(Array(4).fill("aaaa")),
                Array(versionOneAttributesAmount).fill(exampleCID1),
                CORE_ATTRIBUTES,
                {from: owner})
        )
        // empty generator script
        await expectThrow(
            HugoNFT.new(
                tokenURI,
                versionOneAttributesAmount,
                "",
                Array(versionOneAttributesAmount).fill(4),
                Array(versionOneAttributesAmount).fill(Array(4).fill("aaaa")),
                Array(versionOneAttributesAmount).fill(exampleCID1),
                CORE_ATTRIBUTES,
                {from: owner})
        )
        // disproportion in attributes and traits input data lengths
        await expectThrow(
            HugoNFT.new(
                tokenURI,
                versionOneAttributesAmount,
                "some python script",
                Array(2).fill(4),
                Array(versionOneAttributesAmount).fill(Array(4).fill("aaaa")),
                Array(versionOneAttributesAmount).fill(exampleCID1),
                CORE_ATTRIBUTES,
                {from: owner})
        )
        await expectThrow(
            HugoNFT.new(
                tokenURI,
                versionOneAttributesAmount,
                "some python script",
                Array(versionOneAttributesAmount).fill(4),
                Array(6).fill(Array(4).fill("aaaa")),
                Array(versionOneAttributesAmount).fill(exampleCID1),
                CORE_ATTRIBUTES,
                {from: owner})
        )
        // empty attribute name
        await expectThrow(
            HugoNFT.new(
                tokenURI,
                versionOneAttributesAmount,
                "script-attrs-5",
                Array(versionOneAttributesAmount).fill(3),
                [
                    Array(3).fill("Head trait"),
                    Array(3).fill("Glasses trait"),
                    Array(3).fill("Body trait"),
                    Array(3).fill("Shirt trait"),
                    Array(3).fill("Scarf trait")
                ],
                Array(versionOneAttributesAmount).fill(exampleCID1),
                ["HEAD", "GLASSES", "BODY", "SHIRT", ""],
                {from: owner})
        )

        nftContract = await HugoNFT.new(
            tokenURI,
            versionOneAttributesAmount,
            "script-attrs-5",
            Array(versionOneAttributesAmount).fill(3),
            [
                Array(3).fill("Head trait"),
                Array(3).fill("Glasses trait"),
                Array(3).fill("Body trait"),
                Array(3).fill("Shirt trait"),
                Array(3).fill("Scarf trait")
            ],
            Array(versionOneAttributesAmount).fill(exampleCID1),
            CORE_ATTRIBUTES,
            {from: owner});

        // Granting roles
        await nftContract.grantRole(NFT_ADMIN_ROLE, nft_admin, {from: owner});
        await nftContract.grantRole(MINTER_ROLE, minter, {from: owner});
    })

    describe("Managing attributes, traits and attributes CIDs", async() => {
        it("should fail updating multiple attributes CIDs ", async() => {
            let emptyCIDsData = Array(versionOneAttributesAmount).fill("");
            let invalidCIDLenData = Array(versionOneAttributesAmount).fill("12");
            // invalid access
            await expectThrow(
                nftContract.updateMultipleAttributesCIDs(emptyCIDsData, {from: account3})
            )
            // invalid CIDs data length
            await expectThrow(
                nftContract.updateMultipleAttributesCIDs(["1", "2", "3", "4", "5", "6"], {from: nft_admin})
            )
            // invalid length of CID itself
            await expectThrow(
                nftContract.updateMultipleAttributesCIDs(invalidCIDLenData, {from: nft_admin})
            )
        })

        it("should correctly update multiple CIDs except for attributeId = 2", async() => {
            let validCIDsArray = Array(versionOneAttributesAmount).fill(exampleCID2);
            // let attribute id 2 CID be empty
            validCIDsArray[2] = "";
            await nftContract.updateMultipleAttributesCIDs(validCIDsArray, {from: nft_admin})

            let CIDsOfAttrId1 = await nftContract.getCIDsOfAttribute(1);
            let CIDsOfAttrId2 = await nftContract.getCIDsOfAttribute(2);

            let lastCIDs = await nftContract.validCIDs();
            let validCIDAttr1 = lastCIDs[1];
            let validCIDAttr2 = lastCIDs[2];

            assert.equal(CIDsOfAttrId1.length, 2)
            assert.equal(CIDsOfAttrId2.length, 1)
            assert.equal(validCIDAttr1, exampleCID2)
            assert.equal(validCIDAttr2, exampleCID1)
        })

        it("should fail updating CID for attributeId =  2", async() => {
            // invalid access
            await expectThrow(
                nftContract.updateAttributeCID(2, exampleCID2, {from: account3})
            )
            // invalid id
            await expectThrow(
                nftContract.updateAttributeCID(5, exampleCID2, {from: nft_admin})
            )
            // invalid CID length
            await expectThrow(
                nftContract.updateAttributeCID(2, "someInvalidSeed", {from: nft_admin})
            )
        })

        it("should correctly update CID for attributeId = 2", async() => {
            await nftContract.updateAttributeCID(2, exampleCID2, {from: nft_admin})

            let CIDsOfAttrId2 = await nftContract.getCIDsOfAttribute(2);
            let validCIDAttr2 = CIDsOfAttrId2[CIDsOfAttrId2.length - 1];

            assert.equal(CIDsOfAttrId2.length, 2)
            assert.equal(validCIDAttr2, exampleCID2)
        })

        it("shouldn't change anything while updating CIDs with an array of empty strings", async() => {
            let emptyCIDsData = Array(versionOneAttributesAmount).fill("");
            await nftContract.updateMultipleAttributesCIDs(emptyCIDsData, {from: nft_admin});

            // update shouldn't have brought changes
            let attr0CIDs = await nftContract.getCIDsOfAttribute(0);
            assert.equal(attr0CIDs.length, 2);
        })

        it("should fail adding multiple traits", async() => {
            // invalid access
            await expectThrow(
                nftContract.addTraits(
                    HEAD_ID,
                    10,
                    Array(10).fill("ab"),
                    exampleCID1,
                    {from: account1}
                )
            )
            // invalid traits length (over maximum)
            await expectThrow(
                nftContract.addTraits(
                    HEAD_ID,
                    26,
                    Array(10).fill("ab"),
                    exampleCID1,
                    {from: nft_admin}
                )
            )
            // disproportion in trait data length (ids array != name array and e.t.c.)
            await expectThrow(
                nftContract.addTraits(
                    HEAD_ID,
                    25,
                    Array(10).fill("ab"),
                    exampleCID1,
                    {from: nft_admin}
                )
            )
        })

        it("should add multiple traits for attributes", async() => {
            // Add multiple traits
            await nftContract.addTraits(
                HEAD_ID,
                3,
                Array(3).fill("Head trait"),
                exampleCID1,
                {from: nft_admin}
            )
            await nftContract.addTraits(
                GLASSES_ID,
                3,
                Array(3).fill("Glasses trait"),
                exampleCID1,
                {from: nft_admin}
            )
            await nftContract.addTraits(
                BODY_ID,
                3,
                Array(3).fill("Body trait"),
                exampleCID1,
                {from: nft_admin}
            )
            await nftContract.addTraits(
                SHIRT_ID,
                3,
                Array(3).fill("Shirt trait"),
                exampleCID1,
                {from: nft_admin}
            )
            await nftContract.addTraits(
                SCARF_ID,
                3,
                Array(3).fill("Scarf trait"),
                exampleCID1,
                {from: nft_admin}
            )

            let traitsOfAttribute0 = await nftContract.getTraitsOfAttribute(HEAD_ID);
            let traitsOfAttribute1 = await nftContract.getTraitsOfAttribute(GLASSES_ID);
            let traitsOfAttribute2 = await nftContract.getTraitsOfAttribute(SHIRT_ID);
            let traitsOfAttribute3 = await nftContract.getTraitsOfAttribute(BODY_ID);
            let traitsOfAttribute4 = await nftContract.getTraitsOfAttribute(SCARF_ID);

            let equalLength =
                traitsOfAttribute0.length == traitsOfAttribute1.length &&
                traitsOfAttribute1.length == traitsOfAttribute2.length &&
                traitsOfAttribute2.length == traitsOfAttribute3.length &&
                traitsOfAttribute3.length == traitsOfAttribute4.length
            ;

            assert.ok(equalLength);
        })

        it("should fail adding traits by one", async() => {
            // invalid attribute id
            await expectThrow(
                nftContract.addTrait(5, 7, "TTT", exampleCID2, {from: nft_admin})
            )
            // trait id spoils sequence (1,2,3,4,5,6,8 )
            await expectThrow(
                nftContract.addTrait(HEAD_ID, 8, "TTT", exampleCID2, {from: nft_admin})
            )
            // empty name
            await expectThrow(
                nftContract.addTrait(HEAD_ID, 7, "", exampleCID2, {from: nft_admin})
            )
            // invalid access
            await expectThrow(
                nftContract.addTrait(HEAD_ID, 7, "Classical Hat", exampleCID2, {from: account1})
            )
        })

        it("should add traits by one", async() => {
            await nftContract.addTrait(HEAD_ID, 7, "Classical Hat", exampleCID2, {from: nft_admin});
            await nftContract.addTrait(GLASSES_ID, 7,  "RayBan", exampleCID2, {from: nft_admin});
            await nftContract.addTrait(BODY_ID, 7, "Muscular", exampleCID2, {from: nft_admin});
            await nftContract.addTrait(SHIRT_ID, 7, "Tuxedo", exampleCID2, {from: nft_admin});
            await nftContract.addTrait(SCARF_ID, 7, "Gryffindor", exampleCID2, {from: nft_admin});

            let traitsOfAttribute0 = await nftContract.getTraitsOfAttribute(HEAD_ID);
            let traitsOfAttribute1 = await nftContract.getTraitsOfAttribute(GLASSES_ID);
            let traitsOfAttribute2 = await nftContract.getTraitsOfAttribute(BODY_ID);
            let traitsOfAttribute3 = await nftContract.getTraitsOfAttribute(SHIRT_ID);
            let traitsOfAttribute4 = await nftContract.getTraitsOfAttribute(SCARF_ID);

            assert.equal(traitsOfAttribute0.length, 7);
        })
    })

    describe("Minting tests", async() => {

        // todo check cap reached
        it("should fail minting generative nft", async() => {
            // invalid access
            await expectThrow(
                nftContract.mint(account1, [5, 5, 5, 5, 5], "some name", "some descr", {from: account1})
            )
            // mint to address 0
            await expectThrow(
                nftContract.mint(zeroAddress, [5, 5, 5, 5, 5], "some name", "some descr", {from: minter})
            )
            // Seed is invalid: too short
            await expectThrow(
                nftContract.mint(account1, [1, 2, 1, 1], "some name", "some descr", {from: minter})
            )
            // Seed is invalid: too long
            await expectThrow(
                nftContract.mint(account1, [1, 2, 1, 1, 1, 2], "some name", "some descr", {from: minter})
            )
            // Seed is invalid: unexistent trait id
            await expectThrow(
                nftContract.mint(account1, [5, 5, 5, 5, 8], "some name", "some descr", {from: minter})
            )
            // Seed is invalid: zero id for core attribute
            await expectThrow(
                nftContract.mint(account1, [5, 5, 5, 7, 0], "some name", "some descr", {from: minter})
            )
            // invalid name length (empty string)
            await expectThrow(
                nftContract.mint(account1, [5, 5, 5, 5, 5], "", "some descr", {from: minter})
            )
            // invalid descr length (empty string)
            await expectThrow(
                nftContract.mint(account1, [5, 5, 5, 5, 5], "some name", "", {from: minter})
            )
            // invalid name length (too long string). Array(77).join("a") gives 76 char string
            await expectThrow(
                nftContract.mint(account1, [5, 5, 5, 5, 5], Array(77).join("a"), "some descr", {from: minter})
            )
            // invalid descr length (too long string). Array(302).join("a") gives 301 char string
            await expectThrow(
                nftContract.mint(account1, [5, 5, 5, 5, 5], "some name", Array(302).join("a"), {from: minter})
            )
        })

        it("should mint generative nfts", async() => {
            // Mint 3 tokens
            await nftContract.mint(account1, [1, 1, 1, 1, 1], "John Coffey", "Like a drink, but it is written differently", {from: minter});

            // Seed is invalid: minting with the same seed
            await expectThrow(
                nftContract.mint(account2, [1, 1, 1, 1, 1], "John Coffey copy", "Like John Coffey, but copy", {from: minter})
            )

            await nftContract.mint(account1, [2, 2, 2, 2, 2], "Albert", "Why do people think I'm Einstein?", {from: minter});
            await nftContract.mint(account1, [3, 3, 3, 3, 7], "Cristiano", "Yes, I'm CR-7", {from: minter});

            let totalSupply = await nftContract.totalSupply();
            let nftIdsOfAccount1 = await getTokenIdsOfAccount(account1);

            assert.equal(totalSupply.toNumber(), 3)
            assertEqArrays([0,1,2], nftIdsOfAccount1)
        })

        it("should add new attribute and mint", async() => {
            // invalid access
            await expectThrow(
                nftContract.addNewAttributeWithTraits(
                    "EYE",
                    3,
                    Array(3).fill("Eyes trait"),
                    exampleCID2,
                    "script2",
                    {from: minter}
                )
            )
            await nftContract.addNewAttributeWithTraits(
                "eye",
                3,
                Array(3).fill("Eyes trait"),
                exampleCID2,
                "script-attrs-6",
                {from: nft_admin}
            )
            let traitsOfEyeAttribute = await nftContract.getTraitsOfAttribute(EYE_ID);
            let attributesAmount = await nftContract.currentAttributesAmount();

            assert.equal(traitsOfEyeAttribute.length, 3);
            assert.equal(attributesAmount.toNumber(), versionTwoAttributesAmount);

            // can mint with an old type seed
            await nftContract.mint(account2, [1, 2, 3, 4, 5], "test", "test", {from: minter})
            // can't mint because hash for [1, 2, 3, 4, 5, 0] is a hash([1, 2, 3, 4, 5])
            await expectThrow(
                nftContract.mint(account2, [1, 2, 3, 4, 5, 0], "test", "test", {from: minter})
            )
            // can't mint because [1,1,1,1,1] was minted for account1
            await expectThrow(
                nftContract.mint(account2, [1, 1, 1, 1, 1, 0], "test", "test", {from: minter})
            )
            // can mint with 0 id for a new trait id
            await nftContract.mint(account2, [1, 2, 3, 4, 4, 0], "test", "test", {from: minter})
            // invalid trait id for an eye attribute
            await expectThrow(
                nftContract.mint(account2, [1, 2, 3, 4, 5, 4], "test", "test", {from: minter})
            )

            await nftContract.mint(account2, [1, 2, 3, 4, 5, 3], "test", "test", {from: minter})
            await nftContract.mint(account2, [2, 2, 3, 4, 5, 3], "test", "test", {from: minter})

            let totalSupply = await nftContract.totalSupply();
            let nftIdsOfAccount2 = await getTokenIdsOfAccount(account2);

            assert.equal(totalSupply.toNumber(), 7);
            assertEqArrays([3, 4, 5, 6], nftIdsOfAccount2);
        })

        it("minting with a one more attribute to test gaps in seed", async() => {
            await nftContract.addNewAttributeWithTraits(
                "background",
                3,
                Array(3).fill("Background trait"),
                exampleCID1,
                "script-attrs-7",
                {from: nft_admin}
            )

            await nftContract.mint(account1, [1,2,3,4,5,3,3], "test", "test", {from: minter})
            await nftContract.mint(account1, [3,3,1,2,1,0,0], "test", "test", {from: minter})
            // possible to have gaps
            await nftContract.mint(account1, [3,3,1,2,1,0,2], "test", "test", {from: minter})
            // Duplicates
            await expectThrow(
                nftContract.mint(account1, [3,3,1,2,1,0,0], "test", "test", {from: minter})
            )
            await expectThrow(
                nftContract.mint(account1, [3,3,1,2,1,0,2], "test", "test", {from: minter})
            )

            let totalSupply = await nftContract.totalSupply();
            let nftIdsOfAccount1 = await getTokenIdsOfAccount(account1);

            assert.equal(totalSupply.toNumber(), 10);
            assertEqArrays([0,1,2,7,8,9], nftIdsOfAccount1);
        })

        it("should mint exclusive", async() => {
            // invalid access
            await expectThrow(
                nftContract.mintExclusive(account1, "some name", "some descr", exampleCID1, {from: nft_admin})
            )
            // invalid name length (empty string)
            await expectThrow(
                nftContract.mintExclusive(account1, "", "some descr", exampleCID1, {from: minter})
            )
            // invalid descr length (empty string)
            await expectThrow(
                nftContract.mintExclusive(account1, "some name", "", exampleCID1, {from: minter})
            )
            // invalid name length (too long string). Array(77).join("a") gives 76 char string
            await expectThrow(
                nftContract.mintExclusive(account1, Array(77).join("a"), "some descr", exampleCID1, {from: minter})
            )
            // invalid descr length (too long string). Array(302).join("a") gives 301 char string
            await expectThrow(
                nftContract.mintExclusive(account1, "some name", Array(302).join("a"), exampleCID1, {from: minter})
            )
            // minting to zero address
            await expectThrow(
                nftContract.mintExclusive(zeroAddress, "some name", "some descr", exampleCID1, {from: minter})
            )
            // invalid CID length
            await expectThrow(
                nftContract.mintExclusive(account1, "some name", "some descr", "some invalid CID", {from: minter})
            )

            // mint 3 exclusive
            await nftContract.mintExclusive(account1, "some name", "some descr", exampleCID2, {from: minter})
            await nftContract.mintExclusive(account2, "some name", "some descr", exampleCID2, {from: minter})
            await nftContract.mintExclusive(account3, "some name", "some descr", exampleCID2, {from: minter})

            let totalSupply = await nftContract.totalSupply();
            let nftIdsOfAccount1 = await getTokenIdsOfAccount(account1);
            let nftIdsOfAccount2 = await getTokenIdsOfAccount(account2);
            let nftIdsOfAccount3 = await getTokenIdsOfAccount(account3);

            let exclusivelyMinted = await nftContract.exclusiveNFTsAmount();

            assert.equal(totalSupply.toNumber(), 13);
            assertEqArrays([0, 1, 2, 7, 8, 9, 10000], nftIdsOfAccount1);
            assertEqArrays([3, 4, 5, 6, 10001], nftIdsOfAccount2);
            assertEqArrays([10002], nftIdsOfAccount3);
            assert.equal(exclusivelyMinted.toNumber(), 3)
        })

        it("should mint after generative NFTs with correct ids minting exclusive NFTs", async() => {
            await nftContract.mint(minter, [3,3,3,3,3,3,3], "test", "test", {from: minter})
            await nftContract.mint(nft_admin, [3,3,3,3,3,2], "test", "test", {from: minter})

            let totalSupply = await nftContract.totalSupply();
            let nftIdsOfMinter = await getTokenIdsOfAccount(minter);
            let nftIdsOfAdmin = await getTokenIdsOfAccount(nft_admin);

            assert.equal(totalSupply.toNumber(), 15);
            assertEqArrays([10], nftIdsOfMinter);
            assertEqArrays([11], nftIdsOfAdmin);
        })
    })

    describe("Change nft name/description tests", async() => {
        it("changes nft name", async() => {
            // invalid access
            await expectThrow(
                nftContract.changeNFTName(1, "new name", {from: account1})
            )
            // non existent token
            await expectThrow(
                nftContract.changeNFTName(12, "new name", {from: nft_admin})
            )
            // empty string
            await expectThrow(
                nftContract.changeNFTName(1, "", {from: nft_admin})
            )
            // too long string
            await expectThrow(
                nftContract.changeNFTName(1, Array(77).join("a"), {from: nft_admin})
            )

            await nftContract.changeNFTName(1, "Some new name", {from: nft_admin});
            await nftContract.changeNFTName(10000, "Some new name as well", {from: nft_admin});

            let nft1 = await nftContract.getNFT(1);
            let nft2 = await nftContract.getNFT(10000);

            assert.equal(nft1.name, "Some new name");
            assert.equal(nft2.name, "Some new name as well");
        })

        it("changes nft descriptions", async() => {
            // invalid access
            await expectThrow(
                nftContract.changeNFTDescription(1, "new description", {from: account1})
            )
            // non existent token
            await expectThrow(
                nftContract.changeNFTDescription(12, "new description", {from: nft_admin})
            )
            // empty string
            await expectThrow(
                nftContract.changeNFTDescription(1, "", {from: nft_admin})
            )
            // too long string
            await expectThrow(
                nftContract.changeNFTDescription(1, Array(302).join("a"), {from: nft_admin})
            )

            await nftContract.changeNFTDescription(1, "Some new description", {from: nft_admin});
            await nftContract.changeNFTDescription(10000, "Some new description as well", {from: nft_admin});

            let nft1 = await nftContract.getNFT(1);
            let nft2 = await nftContract.getNFT(10000);

            assert.equal(nft1.description, "Some new description");
            assert.equal(nft2.description, "Some new description as well");
        })
    })

    describe("Transfering NFTs", async() => {
        it("should fail: sender doesn't own tokens", async() => {
            // 0 id doesn't belong to account 3
            await expectThrow(
                nftContract.transferFrom(account3, account1, 0, {from: account3})
            )
            // such id doesn't exist
            await expectThrow(
                nftContract.transferFrom(account3, account1, 100, {from: account3})
            )
        })

        it("should fail sending to zero address", async() => {
            await expectThrow(
                nftContract.transferFrom(account1, zeroAddress, 1, {from: account1})
            )
        })

        it("should transfer properly when owner has only one token", async() => {
            await nftContract.transferFrom(account3, account4, 10002, {from: account3});
            let nftIdsOfAccount3 = await getTokenIdsOfAccount(account3);
            let nftIdsOfAccount4 = await getTokenIdsOfAccount(account4);

            assertEqArrays([], nftIdsOfAccount3);
            assertEqArrays([10002], nftIdsOfAccount4);
        })

        it("should transfer properly when having multiple tokens", async() => {
            // sending the first one
            await nftContract.transferFrom(account1, account4, 0, {from: account1});
            let nftIdsOfAccount1 = await getTokenIdsOfAccount(account1);
            let nftIdsOfAccount4 = await getTokenIdsOfAccount(account4);

            assertEqArrays([10000, 1, 2, 7, 8, 9], nftIdsOfAccount1);
            assertEqArrays([10002, 0], nftIdsOfAccount4);

            // checking indxes
            let nft10000 = await nftContract.getNFT(10000);
            assert.equal(nft10000.index, 0);

            // sending the one in the middle
            await nftContract.transferFrom(account1, account4, 7, {from: account1});
            nftIdsOfAccount1 = await getTokenIdsOfAccount(account1);
            nftIdsOfAccount4 = await getTokenIdsOfAccount(account4);

            assertEqArrays([10000, 1, 2, 9, 8], nftIdsOfAccount1);
            assertEqArrays([10002, 0, 7], nftIdsOfAccount4);

            // checking indxes
            let nft9 = await nftContract.getNFT(9);
            assert.equal(nft9.index, 3);

            // sending the last one
            await nftContract.transferFrom(account1, account4, 8, {from: account1});
            nftIdsOfAccount1 = await getTokenIdsOfAccount(account1);
            nftIdsOfAccount4 = await getTokenIdsOfAccount(account4);

            assertEqArrays([10000, 1, 2, 9], nftIdsOfAccount1);
            assertEqArrays([10002, 0, 7, 8], nftIdsOfAccount4);

            // no index changes
            nft10000 = await nftContract.getNFT(10000);
            assert.equal(nft10000.index, 0);
            nft9 = await nftContract.getNFT(9);
            assert.equal(nft9.index, 3);
        })

        it("transferred nfts should have right indexes", async() => {
            let balanceOfAccount4 = await nftContract.balanceOf(account4);
            let nft10002 = await nftContract.getNFT(10002);
            let nft0 = await nftContract.getNFT(0);
            let nft7 = await nftContract.getNFT(7);
            let nft8 = await nftContract.getNFT(8);

            assert.equal(balanceOfAccount4.toNumber(), 4);
            assert.equal(nft10002.index, 0)
            assert.equal(nft0.index, 1)
            assert.equal(nft7.index, 2)
            assert.equal(nft8.index, 3)
        })

        it("should properly transfer NFTs back", async() => {
            await nftContract.transferFrom(account4, account1, 0, {from: account4});
            let nftIdsOfAccount1 = await getTokenIdsOfAccount(account1);
            let nftIdsOfAccount4 = await getTokenIdsOfAccount(account4);

            assertEqArrays([10000, 1, 2, 9, 0], nftIdsOfAccount1);
            assertEqArrays([10002, 8, 7], nftIdsOfAccount4);

            await nftContract.transferFrom(account4, account3, 10002, {from: account4});
            let nftIdsOfAccount3 = await getTokenIdsOfAccount(account3);
            nftIdsOfAccount4 = await getTokenIdsOfAccount(account4);
            assertEqArrays([10002], nftIdsOfAccount3);
            assertEqArrays([7, 8], nftIdsOfAccount4);

            await nftContract.transferFrom(account4, account1, 8, {from: account4});
            nftIdsOfAccount1 = await getTokenIdsOfAccount(account1);
            nftIdsOfAccount4 = await getTokenIdsOfAccount(account4);

            assertEqArrays([10000, 1, 2, 9, 0, 8], nftIdsOfAccount1);
            assertEqArrays([7], nftIdsOfAccount4);

            await nftContract.transferFrom(account4, account1, 7, {from: account4});
            nftIdsOfAccount1 = await getTokenIdsOfAccount(account1);
            nftIdsOfAccount4 = await getTokenIdsOfAccount(account4);

            assertEqArrays([10000, 1, 2, 9, 0, 8, 7], nftIdsOfAccount1);
            assertEqArrays([], nftIdsOfAccount4);

            let balanceOfAcc1 = await nftContract.balanceOf(account1);
            let balanceOfAcc4 = await nftContract.balanceOf(account4);

            assert.equal(balanceOfAcc1.toNumber(), 7);
            assert.equal(balanceOfAcc4.toNumber(), 0);
        })
    })

    describe("Info fns tests", async() => {
        it("should correctly view generated and exlusive nfts amount", async() => {
            let generated = await nftContract.generatedNFTsAmount();
            let exclusive = await nftContract.exclusiveNFTsAmount();
            let totalSupply = await nftContract.totalSupply();

            assert.equal(generated.toNumber(), 12)
            assert.equal(exclusive.toNumber(), 3)
            assert.equal(totalSupply.toNumber(), 15)
        })

        it("should correctly view CIDs for an attribute", async() => {
            // invalid attribute id
            await expectThrow(
                nftContract.getCIDsOfAttribute(8)
            )
            // When trait for EYE attribute was added, we didn't update the CID
            let CIDsOfEye = await nftContract.getCIDsOfAttribute(EYE_ID);
            let lastEyeCID = CIDsOfEye[CIDsOfEye.length - 1];
            let CIDsOfScarf = await nftContract.getCIDsOfAttribute(SCARF_ID);
            let lastScarfCID = CIDsOfScarf[CIDsOfScarf.length - 1];

            assert.equal(lastEyeCID, exampleCID2);
            assert.equal(lastScarfCID, exampleCID2);
        })

        it("should correctly view traits of an attribute", async() => {
            // invalid attribute id
            await expectThrow(
                nftContract.getTraitsOfAttribute(8)
            )
            let traitsOfEye = await nftContract.getTraitsOfAttribute(EYE_ID);
            assert.equal(traitsOfEye.length, 3);
            let traitsOfBackGround = await nftContract.getTraitsOfAttribute(BACKGROUND_ID);
            assert.equal(traitsOfBackGround.length, 3);
        })

        it("should properly check whether seed was used", async() => {
            // invalid seed length: too short
            await expectThrow(
                nftContract.isUsedSeed([1,1,1,1])
            )
            // invalid seed length: too long
            await expectThrow(
                nftContract.isUsedSeed([1,1,1,1,1,1,1,1])
            )
            // invalid trait ids: EYE attribute has only 9 traits
            await expectThrow(
                nftContract.isUsedSeed([1, 1, 1, 1, 1, 10])
            )
            // invalid trait ids: core attributes can't be zero
            await expectThrow(
                nftContract.isUsedSeed([1, 1, 1, 1, 0, 3])
            )
            // invalid trait ids: SCARF attribute has only 7 traits
            await expectThrow(
                nftContract.isUsedSeed([1, 1, 1, 1, 8, 3])
            )

            let isUsed1 = await nftContract.isUsedSeed([1, 1, 1, 1, 1, 0])
            let isUsed2 = await nftContract.isUsedSeed([1, 1, 1, 1, 1, 0, 0])
            let isUsed3 = await nftContract.isUsedSeed([3, 1, 2, 1, 1, 3])
            let isUsed4 = await nftContract.isUsedSeed([1, 2, 3, 4, 5, 3])
            let isUsed5 = await nftContract.isUsedSeed([1, 2, 3, 4, 5, 3, 0])
            let isUsed6 = await nftContract.isUsedSeed([1, 2, 3, 4, 5, 0, 3])
            let isUsed7 = await nftContract.isUsedSeed([1, 2, 5, 7, 7])
            let isUsed8 = await nftContract.isUsedSeed([1, 2, 5, 7, 7, 0])

            // used
            assert.ok(isUsed1)
            // used
            assert.ok(isUsed2)
            // not used
            assert.ok(!isUsed3)
            // used
            assert.ok(isUsed4)
            // used
            assert.ok(isUsed5)
            // not used
            assert.ok(!isUsed6)
            // not used
            assert.ok(!isUsed7)
            // not used
            assert.ok(!isUsed8)
        })

        it("should properly return nfts array", async() => {
            let nfts1 = await nftContract.getNFTs([0, 1, 2, 12, 13, 14, 231, 1212]);
            nfts1.slice(3).every(nft => assert.equal(nft.name, ""));
            // Generated ones have 0 length cid
            nfts1.slice(0, 3).every(nft => {
                assert.equal(nft.seed.length, versionThreeAttributesAmount)
                assert.equal(nft.cid.length, 0)
            })

            let nfts2 = await nftContract.getNFTs([10000, 10001, 10002, 10003, 10004]);
            nfts2.slice(3).every(nft => assert.equal(nft.name, ""));
            // Exclusive ones have 0 length seed
            nfts2.slice(0, 3).every(nft => {
                assert.equal(nft.seed.length, 0)
                assert.equal(nft.cid.length, 46)
            })
        })

        it("nfts should have equal lengths regardless of attributes amount during their mint", async() => {
            let nft1 = await nftContract.getNFT(1);
            let nft5 = await nftContract.getNFT(5);
            let nft9 = await nftContract.getNFT(9);

            assert.equal(nft1.seed.length, versionThreeAttributesAmount);
            assert.ok(nft1.seed.length == nft5.seed.length && nft5.seed.length == nft9.seed.length)
        })

        it("get trait CID address", async() => {
            // invalid attribute id
            await expectThrow(
                nftContract.traitIpfsPath(7, 3)
            )
            // invalid trait id: 0 id is reserved
            await expectThrow(
                nftContract.traitIpfsPath(HEAD_ID, 0)
            )
            // invalid trait id: non existent
            await expectThrow(
                nftContract.traitIpfsPath(BACKGROUND_ID, 4)
            )
            let trait1Address = await nftContract.traitIpfsPath(HEAD_ID, 3);
            assert.equal("ipfs://".concat(exampleCID2, "/", "3"), trait1Address);
            let trait2Address = await nftContract.traitIpfsPath(EYE_ID, 1);
            assert.equal("ipfs://".concat(exampleCID2, "/", "1"), trait2Address);
        })

        it("should properly show script", async() => {
            // too small amount of attributes
            await expectThrow(
                nftContract.getGenerationScriptForAttributesNum(4)
            )
            // huge amount of attributes
            await expectThrow(
                nftContract.getGenerationScriptForAttributesNum(8)
            )
            let script1 = await nftContract.getGenerationScriptForAttributesNum(versionOneAttributesAmount);
            let script2 = await nftContract.getGenerationScriptForAttributesNum(versionTwoAttributesAmount);
            let script3 = await nftContract.getGenerationScriptForAttributesNum(versionThreeAttributesAmount);

            assert.equal(script1, "script-attrs-5");
            assert.equal(script2, "script-attrs-6");
            assert.equal(script3, "script-attrs-7");
        })

        it("should properly show attribute data", async() => {
            let body = await nftContract.getAttributeData(BODY_ID);
            let eye = await nftContract.getAttributeData(EYE_ID);
            let background = await nftContract.getAttributeData(BACKGROUND_ID);

            assert.equal(body.attributeId, BODY_ID);
            assert.equal(eye.attributeId, EYE_ID);
            assert.equal(background.attributeId, BACKGROUND_ID);

            assert.equal(body.name, "body");
            assert.equal(eye.name, "eye");
            assert.equal(background.name, "background");
        })
    })
})
