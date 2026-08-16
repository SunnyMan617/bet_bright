import 'package:betbridge_mobile/models/slip.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('parses the web API contract without losing selection identifiers', () {
    final slip = DecodedSlip.fromJson({
      'code': 'BWTEST1',
      'provider': 'Betway Nigeria',
      'fetchedAt': '2026-08-16T12:00:00.000Z',
      'totalOdds': 2.5,
      'activeSelections': 1,
      'selections': [
        {
          'eventId': 101,
          'marketId': '1011',
          'outcomeId': '10111',
          'event': 'Lagos FC vs Abuja FC',
          'sport': 'soccer',
          'league': 'Premier League',
          'region': 'Nigeria',
          'isLive': false,
          'market': '1X2',
          'selection': 'Home',
          'odds': 2.5,
          'isActive': true,
        }
      ],
    });
    expect(slip.code, 'BWTEST1');
    expect(slip.selections.single.outcomeId, '10111');
    expect(slip.selections.single.odds, 2.5);
  });
}
