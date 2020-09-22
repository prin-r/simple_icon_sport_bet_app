from iconservice import *
from .pyobi import *

TAG = "SportBetApp"

BET_INIT = 0
BET_PENDING_RESOLVE = 1
BET_RESOLVE_OWNER_WIN = 2
BET_RESOLVE_CHALLENGER_WIN = 3

BET_STRUCT_OBI = PyObi(
    """
    {
        date: string,
        home_team_name: string,
        away_team_name: string,
        is_home_win: bool,
        bet_owner: bytes,
        bet_challenger: bytes,
        bet_status: u8
    }
    """
)

REQ_OBI = PyObi(
    """
        {
            client_id: string,
            oracle_script_id: u64,
            calldata: bytes,
            ask_count: u64,
            min_count: u64
        }
    """
)

CALLDATA_OBI = PyObi(
    """
        {
            date: string,
            home_team_name: string,
            away_team_name: string
        }
    """
)

SCORES_OBI = PyObi(
    """
        {
            home_score: u32,
            away_score: u32
        }
    """
)


class IBridge(InterfaceScore):
    @interface
    def relay_and_verify(self, proof: bytes) -> dict:
        pass


class SportBetApp(IconScoreBase):
    def __init__(self, db: IconScoreDatabase) -> None:
        super().__init__(db)
        self.bridge_address = VarDB("bridge_address", db, value_type=Address)

        # general config for request template
        self.client_id = VarDB("client_id", db, value_type=str)
        self.oracle_script_id = VarDB("oracle_script_id", db, value_type=int)
        self.ask_count = VarDB("ask_count", db, value_type=int)
        self.min_count = VarDB("min_count", db, value_type=int)

        # betting state
        self.bet_count = VarDB("bet_count", db, value_type=int)
        self.bets = DictDB("bets", db, value_type=bytes)

    def on_install(
        self,
        bridge_address: Address,
        client_id: str,
        oracle_script_id: int,
        ask_count: int,
        min_count: int,
    ) -> None:
        super().on_install()
        self.bridge_address.set(bridge_address)
        self.client_id.set(client_id)
        self.oracle_script_id.set(oracle_script_id)
        self.ask_count.set(ask_count)
        self.min_count.set(min_count)

    def on_update(self) -> None:
        super().on_update()

    @external(readonly=True)
    def get_bridge_address(self) -> Address:
        return self.bridge_address.get()

    @external(readonly=True)
    def get_bet_count(self) -> int:
        return self.bet_count.get()

    def _get_general_config(self) -> dict:
        return {
            "client_id": self.client_id.get(),
            "oracle_script_id": self.oracle_script_id.get(),
            "ask_count": self.ask_count.get(),
            "min_count": self.min_count.get(),
        }

    @external(readonly=True)
    def get_general_config(self) -> dict:
        return self._get_general_config()

    @external
    def set_general_config(
        self, client_id: str, oracle_script_id: int, ask_count: int, min_count: int
    ) -> None:
        if self.msg.sender != self.owner:
            self.revert("not authorized")
        self.client_id.set(client_id)
        self.oracle_script_id.set(oracle_script_id)
        self.ask_count.set(ask_count)
        self.min_count.set(min_count)

    def _get_bet_by_id(self, bet_id: int) -> dict:
        if bet_id >= self.bet_count.get():
            self.revert(
                f"bet_id should be less than {self.bet_count.get()} (bet_count) but got {bet_id}"
            )
        return BET_STRUCT_OBI.decode(self.bets[bet_id])

    @external(readonly=True)
    def get_bet_by_id(self, bet_id: int) -> dict:
        return self._get_bet_by_id(bet_id)

    @external
    @payable
    def create_bet(
        self, date: str, home_team_name: str, away_team_name: str, is_home_win: bool
    ) -> None:
        if self.msg.value != 1_000_000_000_000_000_000:
            self.revert("msg.value must equal to 1 ICX")

        current_bet_count = self.bet_count.get()
        self.bets[current_bet_count] = BET_STRUCT_OBI.encode(
            {
                "date": date,
                "home_team_name": home_team_name,
                "away_team_name": away_team_name,
                "is_home_win": is_home_win,
                "bet_owner": self.msg.sender.to_bytes(),
                "bet_challenger": b"",
                "bet_status": BET_INIT,
            }
        )

        self.bet_count.set(current_bet_count + 1)

    @external
    @payable
    def challenge(self, bet_id: int) -> None:
        bet = self._get_bet_by_id(bet_id)
        if bet["bet_status"] != BET_INIT:
            self.revert(f"bet_status should be {BET_INIT} but got {bet['bet_status']}")
        if self.msg.value != 1_000_000_000_000_000_000:
            self.revert("msg.value must equal to 1 ICX")

        bet["bet_challenger"] = self.msg.sender.to_bytes()
        bet["bet_status"] = BET_PENDING_RESOLVE

        self.bets[bet_id] = BET_STRUCT_OBI.encode(bet)

    def _get_request_key_from_bet_id(self, bet_id: int) -> bytes:
        bet = self._get_bet_by_id(bet_id)
        req_packet = self._get_general_config()
        req_packet["calldata"] = CALLDATA_OBI.encode(
            {
                "date": bet["date"],
                "home_team_name": bet["home_team_name"],
                "away_team_name": bet["away_team_name"],
            }
        )
        return REQ_OBI.encode(req_packet)

    @external(readonly=True)
    def get_request_key_from_bet_id(self, bet_id: int) -> bytes:
        return self._get_request_key_from_bet_id(bet_id)

    @external
    def resolve_bet(self, bet_id: int, proof: bytes) -> None:
        bet = self._get_bet_by_id(bet_id)
        if bet["bet_status"] != BET_PENDING_RESOLVE:
            self.revert(f"bet_status should be {BET_PENDING_RESOLVE} but got {bet['bet_status']}")

        bridge = self.create_interface_score(self.bridge_address.get(), IBridge)
        packet = bridge.relay_and_verify(proof)
        req = packet["req"]
        res = packet["res"]

        if REQ_OBI.encode(req) != self._get_request_key_from_bet_id(bet_id):
            self.revert("NOT_RELEVANT_PROOF")

        scores = SCORES_OBI.decode(res["result"])

        is_home_win = scores["home_score"] > scores["away_score"]

        if bet["is_home_win"] == is_home_win:
            winner = Address.from_bytes(bet["bet_owner"])
            bet["bet_status"] = BET_RESOLVE_OWNER_WIN
        else:
            winner = Address.from_bytes(bet["bet_challenger"])
            bet["bet_status"] = BET_RESOLVE_CHALLENGER_WIN

        self.icx.transfer(winner, 2_000_000_000_000_000_000)
        self.bets[bet_id] = BET_STRUCT_OBI.encode(bet)

