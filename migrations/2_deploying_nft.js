const HugoNFT = artifacts.require("HugoNFT");

const TRAIT_NUM = 3;
const ATTRIBUTE_NAMES = ["head", "glasses", "body", "shirt", "scarf"];
const exampleCID = "QmbWqxBEKC3P8tqsKc98xmWNzrzDtRLMiMPL8wBuTGsMnR";
const constructorParams = {
    baseURI: "your base uri",
    initialAmountOfAttributes: ATTRIBUTE_NAMES.length,
    generationScript: "some py script",
    traitAmountForEachAttribute: Array(ATTRIBUTE_NAMES.length).fill(TRAIT_NUM),
    // [["head0", "head1", "head2"], ["glasses0", ...], ...]
    traitNamesForEachAttribute: ATTRIBUTE_NAMES
        .map((e) => Array(TRAIT_NUM)
            .fill(e)
            .map((e, i) => e+i)
        ),
    CIDsForEachAttribute: Array(ATTRIBUTE_NAMES.length).fill(exampleCID),
    attributesNames: ATTRIBUTE_NAMES,
};
const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

module.exports = function(deployer, network, accounts) {
    // const account1 = accounts[0];
    // const account2 = accounts[1];
    // const account3 = accounts[2];
    // const account4 = accounts[3];
    // const nft_admin = accounts[4];
    const minter = accounts[5];
    const owner = accounts[6];

    if (network === 'testing') {
        deployer.deploy(
            HugoNFT,
            constructorParams.baseURI,
            constructorParams.initialAmountOfAttributes,
            constructorParams.generationScript,
            constructorParams.traitAmountForEachAttribute,
            constructorParams.traitNamesForEachAttribute,
            constructorParams.CIDsForEachAttribute,
            constructorParams.attributesNames,
            {from: owner}
        ).then((instance) => {
            console.log("[SUCCESSFULLY DEPLOYED]:", instance.address)
            instance.grantRole(MINTER_ROLE, minter, {from: owner}).then(() => {
                console.log("ADDRESS", minter, "HAS NOW ROLE", MINTER_ROLE, "(MINTER_ROLE)")
            })
        });
    }
}