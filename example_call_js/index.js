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
const { CallTransactionBuilder, CallBuilder } = IconBuilder;
const encode = require("./obi");

const ICON_PRIVATE_KEY = "xxx";
const BRIDGE_CONTRACT = "cx4f8d1d27749739cfb02476a6ea2a20523ee4c48d";
const ICON_ENDPOINT = "https://bicon.net.solidwallet.io/api/v3";
const BAND_ENDPOINT = "http://guanyu-testnet3-query.bandchain.org";
const BAND_MNEMONIC =
  "panther winner rain empower olympic attract find satoshi meadow panda job ten urge warfare piece walnut help jump usage vicious neither shallow mule laundry";

// Instantiating BandChain with endpoint
const bandchain = new BandChain(BAND_ENDPOINT);

// Instantiating IconService with endpoint
const iconService = new IconService(new HttpProvider(ICON_ENDPOINT));

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

    return [proof["jsonProof"], oracleScript];
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

    return [proof["jsonProof"], oracleScript];
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

  console.log("sender: ", wallet.getAddress());

  try {
    const txHash = await iconService
      .sendTransaction(signedTransaction)
      .execute();
    console.log("txHash: ", txHash);
  } catch (e) {
    console.log(e);
  }
};

const getResultInIcon = async (requestKey, schema) => {
  const callBuilder = new CallBuilder();
  const call = callBuilder
    .to(BRIDGE_CONTRACT)
    .method("get_latest_response")
    .params({ encoded_request: requestKey.toString("hex") })
    .build();

  const res = await iconService.call(call).execute();
  return new Obi(schema).decodeOutput(
    Buffer.from(res["result"].slice(2), "hex")
  );
};

(async () => {
  // Get proof from Bandchain
  // const [proof, oracleScript] = await requestOdd();
  const [proof, oracleScript] = await requestScore();
  console.log("band's block height: ", proof["blockHeight"]);

  const encodedProof = encode(proof, "Proof");
  const requestKey = encode(
    proof["oracleDataProof"]["requestPacket"],
    "RequestPacket"
  );

  // Relay proof to icon chain
  console.log("request key: ", requestKey.toString("hex"));
  await sendRelay(encodedProof.toString("hex"));

  // Check result on Icon
  console.log("Checking result on icon");
  const result = await getResultInIcon(requestKey, oracleScript.schema);
  console.log(result);

  console.log("done!");
})();
