class SlipLeg {
  const SlipLeg({
    required this.eventId,
    required this.marketId,
    required this.outcomeId,
    required this.event,
    required this.sport,
    required this.league,
    required this.region,
    required this.isLive,
    required this.market,
    required this.selection,
    required this.odds,
    required this.isActive,
    this.startsAt,
  });

  final int eventId;
  final String marketId;
  final String outcomeId;
  final String event;
  final String sport;
  final String league;
  final String region;
  final DateTime? startsAt;
  final bool isLive;
  final String market;
  final String selection;
  final double odds;
  final bool isActive;

  factory SlipLeg.fromJson(Map<String, dynamic> json) => SlipLeg(
        eventId: (json['eventId'] as num).toInt(),
        marketId: json['marketId'] as String,
        outcomeId: json['outcomeId'] as String,
        event: json['event'] as String,
        sport: json['sport'] as String,
        league: json['league'] as String,
        region: json['region'] as String? ?? '',
        startsAt: json['startsAt'] == null
            ? null
            : DateTime.parse(json['startsAt'] as String).toLocal(),
        isLive: json['isLive'] as bool? ?? false,
        market: json['market'] as String,
        selection: json['selection'] as String,
        odds: (json['odds'] as num).toDouble(),
        isActive: json['isActive'] as bool? ?? false,
      );
}

class DecodedSlip {
  const DecodedSlip({
    required this.code,
    required this.provider,
    required this.fetchedAt,
    required this.selections,
    required this.totalOdds,
    required this.activeSelections,
  });

  final String code;
  final String provider;
  final DateTime fetchedAt;
  final List<SlipLeg> selections;
  final double totalOdds;
  final int activeSelections;

  factory DecodedSlip.fromJson(Map<String, dynamic> json) => DecodedSlip(
        code: json['code'] as String,
        provider: json['provider'] as String,
        fetchedAt: DateTime.parse(json['fetchedAt'] as String).toLocal(),
        selections: (json['selections'] as List<dynamic>)
            .map((item) => SlipLeg.fromJson(item as Map<String, dynamic>))
            .toList(growable: false),
        totalOdds: (json['totalOdds'] as num).toDouble(),
        activeSelections: (json['activeSelections'] as num).toInt(),
      );
}
