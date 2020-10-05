const BandChain = require("@bandprotocol/bandchain.js");
const { Obi } = require("@bandprotocol/obi.js");

const endpoint = "http://guanyu-devnet.bandchain.org/rest";

const getNBAScore = async () => {
  // Instantiating BandChain with REST endpoint
  const bandchain = new BandChain(endpoint);

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

    console.log(requestId);

    // Get final result (blocking until the reports & aggregations are finished)
    const finalResult = await bandchain.getRequestResult(requestId);
    let result = new Obi(oracleScript.schema).decodeOutput(
      Buffer.from(finalResult.response_packet_data.result, "base64")
    );
    console.log("RequestID: " + requestId);
    console.log(result);
  } catch {
    console.error("Data request failed");
  }
};

getNBAScore();
