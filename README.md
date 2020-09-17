# Simple ICON Sport Betting App

## Setup

```
virtualenv -p python3 .
source bin/activate
pip install tbears
```

## Run test

```
tbears test sport_bet_app
```

## Deployment

```
tbears deploy sport_bet_app -k my_key.key -c sport_bet_app/deploy_testnet.json -n 3
```

## Example deployed contracts on the testnet

#### ReceiverMock contract

[`cxa8a5044feac20d294093dbe9fed0f290e07f5604`](https://bicon.tracker.solidwallet.io/contract/cxa8a5044feac20d294093dbe9fed0f290e07f5604#readcontract)

#### Bridge contract

[`cx8c75fe79e01a2b0ee2b8fd32fe3e95628e1b6af5`](https://bicon.tracker.solidwallet.io/contract/cx8c75fe79e01a2b0ee2b8fd32fe3e95628e1b6af5#readcontract)

## Interactions

- create_bet

  ```
  tbears sendtx ./sport_bet_app/send_create_bet.json -k my_key.key -u https://bicon.net.solidwallet.io/api/v3 -n 3
  ```

- challenge

  ```
  tbears sendtx ./sport_bet_app/send_challenge.json -k challenger_key.key -u https://bicon.net.solidwallet.io/api/v3 -n 3
  ```

- relay_bridge

  ```
  tbears sendtx ./sport_bet_app/send_relay_bridge.json -k my_key.key -u https://bicon.net.solidwallet.io/api/v3 -n 3
  ```

- resolve_bet
  ```
  tbears sendtx ./sport_bet_app/send_resolve_bet.json -k my_key.key -u https://bicon.net.solidwallet.io/api/v3 -n 3
  ```

## Scenarios

1. create_bet: Make bets by giving the names of the two basketball teams that will play against each other, the date of the match, and the winning team. The bet will be stored in the contract's state where the current `bet_count` will be used as the bet's ID with an empty challenger and bet_status = 0. The creator must pay exactly 1 ICX to create the betting position.

```
          create_bet(
            "2019-11-25",
            "TeamA",
            "TeamB"        ===================
          )                |                 |
creater ------------------>|  sport_bet_app  |
          value = 1 ICX    |                 |
                           ===================
```

2. challenge: Challenge an active betting where the challenger must provide the betting ID that he/she wish to challenge. The challenger can only challenge the betting with status == 0 (active). If the giving bet's ID is not exist (bet_id >= bet_count) or its `bet_status` != 0 then the challenge tx will fail. After the challenge is successful, the status of the bet (`bet_status`) will be changed from 0 to 1. The challenge must pay exactly 1 ICX to complete the challenge.

```
        # if you want to challenge betting 999
          challenge(999)                       ===================
                                               |                 |
challenger ----------------------------------->|  sport_bet_app  |
              value = 1 ICX                    |                 |
                                               ===================
```

3. resolve_bet: Resolve any bets with players on both sides (creater and challenger) by providing the betting ID as input to the `resolve_bet` function. If the reponse is found in the bridge contract, the function will be able to find a winner, where the winner will have his/her own ICX plus the loser's ICX (always 2 ICX).

   - If giving bet_id does not exist (bet_id >= bet_count) tx will fail.
   - If the status of the betting that according to the given bet_id is not equal to 1 then the tx will fail.
   - If the reponse is not found in the bridge contract (because the it has never been relayed to the bridge contract), the tx will fail.

```
        # if you want to resolve betting 999
          resolve_bet(999)                  ===================  get_latest_response  ============
winner ------------------------------------>|                 | --------------------> |          |
   ^                                        |  sport_bet_app  |                       |  bridge  |
   |                                        |                 | <-------------------- |          |
   ---------------------------------------- ===================    response dict      ============
               value = 2 ICX
```

4. relay: No one can resolve a betting without proof from BandChain. Hence, someone has to take proof from the BandChain in order to relay it to the bridge contract in the Icon chain.

```
        # Any one can relay the response to the bridge contract by copy
        # proof from the scan (https://guanyu-devnet.cosmoscan.io/oracle-script/85)
        # and then calling relay function with the proof as a parameter.
                                            ============
                   relay(proof)             |          |
relayer ----------------------------------->|  bridge  |
                                            |          |
                                            ============

```

Obtaining proof can be done by following the steps below.

1.  Go to devnet's scan at [oracle-script-85](https://guanyu-devnet.cosmoscan.io/oracle-script/85).
    ![img](https://user-images.githubusercontent.com/12705423/93473449-3ca5f400-f920-11ea-94f9-99bb87c3efe1.png)

2.  Click `connect` button at the top right of the page then the connection modal will appear. After that enter the mnemonic `dev` just for the testing purpose and then click `connect` button in the modal.
    ![img](https://user-images.githubusercontent.com/12705423/93473852-bb9b2c80-f920-11ea-8a79-6ce712f2a8b0.png)

    The test account will contain some balance for testing.
    ![img](https://user-images.githubusercontent.com/12705423/93474236-467c2700-f921-11ea-8a67-3fe16b3e885a.png)

3.  Fill in the same information that you used to create a bet on sport_bet_app contract on Icon Chain which are date, home_team and away_team. This information is used to specify the basketball match you wish to bet on.
    ![img](https://user-images.githubusercontent.com/12705423/93474601-c3a79c00-f921-11ea-82dd-58421409f5b3.png)

4.  Click `Request` button and then wait util you see the proof.
    ![img](https://user-images.githubusercontent.com/12705423/93475975-74fb0180-f923-11ea-80e8-c75bf10e7d97.png)

5.  Click `copy-non-evm-proof` button to copy the proof

6.  Use the copied proof at [send_relay_bridge.json](./sport_bet_app/send_relay_bridge.json)

        ```json
        {
          "jsonrpc": "2.0",
          "method": "icx_sendTransaction",
          "params": {
            "version": "0x3",
            "from": "hx55814f724bbffe49bfa4555535cd9d7e0e1dff32",
            "value": "0x0",
            "stepLimit": "0x3000000",
            "timestamp": "0x59aaeb314a940",
            "nid": "0x3",
            "nonce": "0x1",
            "to": "cx8c75fe79e01a2b0ee2b8fd32fe3e95628e1b6af5",
            "dataType": "call",
            "data": {
              "method": "relay",
              "params": {
                "proof": "0000000966726f6d5f7363616e00000000000000550000003c0000000a323031392d31312d32350000001922436f6d756e69636163696f6e6573204d65726365646573220000000d2253616e204c6f72656e7a6f22000000000000000400000000000000040000000966726f6d5f7363616e000000000001c9b500000000000000040000000064d832e80000000064d8273001000000080000005700000063"
              }
            }
          },
          "id": 1
        }
        ```
