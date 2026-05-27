from enum import Enum


class Registration(str, Enum):
    THREE = "3"
    FOUR = "4"


# Paper orientation: portrait keeps cards upright, landscape rotates them 90 degrees.
class Orientation(str, Enum):
    PORTRAIT = "portrait"
    LANDSCAPE = "landscape"


class OrientationMode(str, Enum):
    """CLI orientation selection. OPTIMIZE tries both and picks the best."""
    OPTIMIZE = "optimize"
    LANDSCAPE = Orientation.LANDSCAPE.value
    PORTRAIT = Orientation.PORTRAIT.value
