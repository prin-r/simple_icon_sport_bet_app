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
const encode = require("./obi");

const ICON_PRIVATE_KEY = "xxx";
const BRIDGE_CONTRACT = "cx4f8d1d27749739cfb02476a6ea2a20523ee4c48d";
const BAND_ENDPOINT = "http://guanyu-testnet3-query.bandchain.org";
const BAND_MNEMONIC =
  "panther winner rain empower olympic attract find satoshi meadow panda job ten urge warfare piece walnut help jump usage vicious neither shallow mule laundry";

// Instantiating BandChain with endpoint
const bandchain = new BandChain(BAND_ENDPOINT);

// Instantiating IconService with endpoint
const iconService = new IconService(
  new HttpProvider("https://bicon.net.solidwallet.io/api/v3")
);

// Request params
const minCount = 3;
const askCount = 4;

// Odd oracle script id
const odd_oracle_script_id = 10;

// Score oracle script id
const score_oracle_script_id = 16;

const requestOdd = async () => {
  // Create an instance of OracleScript with the script ID
  const oracleScript = await bandchain.getOracleScript(odd_oracle_script_id);

  // Create a new request, which will block until the tx is confirmed
  try {
    const mnemonic = BAND_MNEMONIC;
    const requestId = await bandchain.submitRequestTx(
      oracleScript,
      {
        category: "football",
        date1: "29.11.2020",
        date2: "29.11.2020",
        contest_id: "90988",
        odds_type: "handicap",
        bookmaker_id: "158",
        multiplier: 10000,
      },
      { minCount, askCount },
      mnemonic
    );

    console.log("RequestID: " + requestId);
    const proof = await bandchain.getRequestProof(requestId);

    return proof["jsonProof"];
  } catch (e) {
    console.log(e);
    console.error("Data request failed");
  }
};

const requestScore = async () => {
  // Create an instance of OracleScript with the script ID
  const oracleScript = await bandchain.getOracleScript(score_oracle_script_id);

  // Create a new request, which will block until the tx is confirmed
  try {
    const mnemonic = BAND_MNEMONIC;
    const requestId = await bandchain.submitRequestTx(
      oracleScript,
      {
        category: "football",
        date: "11.10.2020",
        contest_id: "90891",
      },
      { minCount, askCount },
      mnemonic
    );

    console.log("RequestID: " + requestId);
    const proof = await bandchain.getRequestProof(requestId);

    return proof["jsonProof"];
  } catch (e) {
    console.log(e);
    console.error("Data request failed");
  }
};

const sendRelay = async (proof) => {
  const wallet = IconWallet.loadPrivateKey(ICON_PRIVATE_KEY);

  const txObj = new CallTransactionBuilder()
    .from(wallet.getAddress())
    .to(BRIDGE_CONTRACT)
    .stepLimit(IconConverter.toBigNumber("3000000"))
    .nid(IconConverter.toBigNumber("3"))
    .nonce(IconConverter.toBigNumber("1"))
    .version(IconConverter.toBigNumber("3"))
    .timestamp(new Date().getTime() * 1000)
    .method("relay")
    .params({ proof })
    .build();

  const signedTransaction = new SignedTransaction(txObj, wallet);

  console.log(wallet.getAddress());

  try {
    const txHash = await iconService
      .sendTransaction(signedTransaction)
      .execute();
    console.log(txHash);
  } catch (e) {
    console.log(e);
  }
};

(async () => {
  // Get proof from Bandchain
  const proof = await requestOdd();
  console.log("band's block height: ", proof["blockHeight"]);

  const encodedProof = encode(proof, "Proof");
  const requestKey = encode(
    proof["oracleDataProof"]["requestPacket"],
    "RequestPacket"
  );

  console.log("request key: ", requestKey.toString("hex"));

  // Relay proof to icon chain
  await sendRelay(encodedProof.toString("hex"));

  console.log("done!");
})();
