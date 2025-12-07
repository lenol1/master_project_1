from api import map_category_name_to_id


def test_exact_match():
    assert map_category_name_to_id('Продукти') == 1


def test_substring_match():
    # 'Аптека' should map to 13 via substring
    assert map_category_name_to_id('Аптека') == 13


def test_lice_match():
    assert map_category_name_to_id('Ліки') == 13


def test_supermarket():
    assert map_category_name_to_id('Супермаркет') == 6


def test_unknown():
    assert map_category_name_to_id('Суперкаліфрагілістик') is None
