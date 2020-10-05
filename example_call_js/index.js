const BandChain = require("@bandprotocol/bandchain.js");
const { Obi } = require("@bandprotocol/obi.js");
const IconService = require("icon-sdk-js");
const {
  IconBuilder,
  IconConverter,
  SignedTransaction,
  IconWallet,
  HttpProvider,
} = IconService;
const { CallTransactionBuilder } = IconBuilder;

const PRIVATE_KEY = "xxx";
const BETTING_CONTRACT = "cx5cc2207df262d0bc8208f0dfd6bcb8ce68f94220";
const BAND_ENDPOINT = "http://guanyu-devnet.bandchain.org/rest";
const BET_ID = 1;

const getNBAScore = async () => {
  // Instantiating BandChain with REST endpoint
  const bandchain = new BandChain(BAND_ENDPOINT);

  // Create an instance of OracleScript with the script ID
  const oracleScript = await bandchain.getOracleScript(85);

  // Create a new request, which will block until the tx is confirmed
  try {
    const minCount = 3;
    const askCount = 4;
    const mnemonic =
      "panther winner rain empower olympic attract find satoshi meadow panda job ten urge warfare piece walnut help jump usage vicious neither shallow mule laundry";
    const requestId = await bandchain.submitRequestTx(
      oracleScript,
      {
        date: "2019-11-25",
        home_team: `"Comunicaciones Mercedes"`,
        away_team: `"San Lorenzo"`,
      },
      { minCount, askCount },
      mnemonic
    );

    const proof = await bandchain.getRequestNonEVMProof(requestId);

    console.log("RequestID: " + requestId);
    let result = new Obi(oracleScript.schema).decodeOutput(
      Buffer.from(proof.slice(-16), "hex")
    );
    console.log("Result:", result);

    return proof;
  } catch (e) {
    console.log(e);
    console.error("Data request failed");
  }
};

const sendResolveBet = async (proof) => {
  const wallet = IconWallet.loadPrivateKey(PRIVATE_KEY);
  const iconService = new IconService(
    new HttpProvider("https://bicon.net.solidwallet.io/api/v3")
  );

  const txObj = new CallTransactionBuilder()
    .from(wallet.getAddress())
    .to(BETTING_CONTRACT)
    .stepLimit(IconConverter.toBigNumber("2000000"))
    .nid(IconConverter.toBigNumber("3"))
    .nonce(IconConverter.toBigNumber("1"))
    .version(IconConverter.toBigNumber("3"))
    .timestamp(new Date().getTime() * 1000)
    .method("mumumumu")
    .params({
      bet_id: BET_ID,
      proof,
    })
    .build();

  console.log(txObj);

  const signedTransaction = new SignedTransaction(txObj, wallet);
  const txHash = await iconService.sendTransaction(signedTransaction).execute();

  // TODO: Fix this because still cause error
  console.log(typeof txHash, txHash);
  const txResult = await iconService.getTransactionResult(txHash).execute();

  console.log(txResult);
};

(async () => {
  const proof = await getNBAScore();
  await sendResolveBet(proof);
})();
