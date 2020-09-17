from ..sport_bet_app import SportBetApp
from tbears.libs.scoretest.score_test_case import ScoreTestCase


class TestSportBetApp(ScoreTestCase):
    def setUp(self):
        super().setUp()
        self.score = self.get_score_instance(SportBetApp, self.test_account1)

