"""
Tests for the Sorcery: Contested Realm plugin.
Tests API integration with curiosa.io.
"""
import os
import shutil
import tempfile
import pytest

from plugins.sorcery_contested_realm.curiosa import get_curiosa_decklist, get_handle_card, CURIOSA_API_BASE, DECK_ENDPOINTS
from plugins.sorcery_contested_realm.deck_formats import DeckFormat, parse_deck


# --- Unit Tests ---

class TestDeckFormatEnum:
    """Test the DeckFormat enum values."""

    def test_curiosa_url_format_value(self):
        """Test that the CURIOSA_URL format has the expected value."""
        assert DeckFormat.CURIOSA_URL.value == 'curiosa_url'


class TestCuriosaurlFormat:
    """Test Curiosa deck URL format parsing."""

    def test_share_url_pattern_matches(self):
        """Test that valid Curiosa deck URLs are detected."""
        import re
        pattern = re.compile(r'https://curiosa\.io/decks/(\w+)')

        assert pattern.match("https://curiosa.io/decks/cme5x329q00k9jo04ouuycsek")
        assert pattern.match("https://curiosa.io/decks/abc123")

    def test_share_url_pattern_rejects_invalid(self):
        """Test that invalid lines are rejected."""
        import re
        pattern = re.compile(r'https://curiosa\.io/decks/(\w+)')

        assert not pattern.match("")
        assert not pattern.match("cme5x329q00k9jo04ouuycsek")  # bare ID, no URL
        assert not pattern.match("https://example.com/decks/cme5x329q00k9jo04ouuycsek")

    def test_share_url_extracts_deck_id(self):
        """Test that the deck ID is correctly extracted from a URL."""
        import re
        pattern = re.compile(r'https://curiosa\.io/decks/(\w+)')

        match = pattern.match("https://curiosa.io/decks/cme5x329q00k9jo04ouuycsek")
        assert match is not None
        assert match.group(1) == "cme5x329q00k9jo04ouuycsek"


# --- Integration Tests ---

@pytest.mark.integration
class TestCuriosaTRPCAPI:
    """Test Curiosa TRPC API requests."""

    def test_curiosa_api_availability(self):
        """Test that the Curiosa TRPC API server is reachable."""
        # Call with an invalid deck ID - TRPC returns 200 with error data in body
        # rather than an HTTP error for individual query failures
        decklist = get_curiosa_decklist('invalid-deck-id-for-availability-test')
        # Returns an empty list for non-existent decks
        assert isinstance(decklist, list)

    def test_curiosa_api_base_url(self):
        """Test that the Curiosa API base URL is configured correctly."""
        assert CURIOSA_API_BASE == 'https://curiosa.io/api/trpc/'

    def test_curiosa_deck_endpoints(self):
        """Test that the expected deck endpoints are configured."""
        assert 'deck.getDecklistById' in DECK_ENDPOINTS
        assert 'deck.getAvatarById' in DECK_ENDPOINTS


@pytest.mark.integration
class TestFullFetchWorkflow:
    """Integration tests for the complete card fetching workflow."""

    @pytest.fixture
    def temp_dirs(self):
        """Create temporary directories for test output."""
        front_dir = tempfile.mkdtemp()
        yield front_dir
        shutil.rmtree(front_dir)

    def test_fetch_deck_from_curiosa(self, temp_dirs):
        """Test fetching cards from a Curiosa deck URL."""
        front_dir = temp_dirs

        deck_url = "https://curiosa.io/decks/cme5x329q00k9jo04ouuycsek"

        handle_card = get_handle_card(front_dir)
        parse_deck(deck_url, DeckFormat.CURIOSA_URL, handle_card)

        files = os.listdir(front_dir)
        assert len(files) >= 1

        for f in files:
            file_path = os.path.join(front_dir, f)
            assert os.path.getsize(file_path) > 0
