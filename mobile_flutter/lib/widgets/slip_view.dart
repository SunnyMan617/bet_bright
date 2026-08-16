import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../models/slip.dart';

const ink = Color(0xFF071A0F);
const green = Color(0xFF15A15C);
const cream = Color(0xFFF5F6F0);

class SlipView extends StatelessWidget {
  const SlipView({super.key, required this.slip});
  final DecodedSlip slip;

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFDDE4DC)),
        boxShadow: const [
          BoxShadow(color: Color(0x0D071A0F), blurRadius: 28, offset: Offset(0, 12)),
        ],
      ),
      child: Column(
        children: [
          _Header(code: slip.code),
          _Summary(slip: slip),
          for (var i = 0; i < slip.selections.length; i++)
            _Leg(leg: slip.selections[i], index: i),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.code});
  final String code;

  @override
  Widget build(BuildContext context) => ColoredBox(
        color: ink,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(18, 16, 10, 16),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('BOOKING CODE', style: TextStyle(color: Color(0xFF8EA197), fontSize: 9, letterSpacing: 1.4, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 3),
                    Text(code, style: const TextStyle(color: Colors.white, fontSize: 20, letterSpacing: 1.2, fontWeight: FontWeight.w800)),
                  ],
                ),
              ),
              TextButton.icon(
                onPressed: () async {
                  await Clipboard.setData(ClipboardData(text: code));
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Booking code copied')));
                  }
                },
                icon: const Icon(Icons.copy_rounded, size: 16),
                label: const Text('Copy'),
                style: TextButton.styleFrom(foregroundColor: Colors.white),
              ),
            ],
          ),
        ),
      );
}

class _Summary extends StatelessWidget {
  const _Summary({required this.slip});
  final DecodedSlip slip;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFDDE4DC)))),
        child: Row(
          children: [
            _Stat(label: 'Total odds', value: slip.totalOdds.toStringAsFixed(2)),
            const _Divider(),
            _Stat(label: 'Selections', value: '${slip.selections.length}'),
            const _Divider(),
            _Stat(label: 'Available', value: '${slip.activeSelections}/${slip.selections.length}'),
          ],
        ),
      );
}

class _Divider extends StatelessWidget {
  const _Divider();
  @override
  Widget build(BuildContext context) => Container(width: 1, height: 31, color: const Color(0xFFE6EBE5), margin: const EdgeInsets.symmetric(horizontal: 10));
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: Color(0xFF849088), fontSize: 9)),
            const SizedBox(height: 2),
            Text(value, style: const TextStyle(color: ink, fontWeight: FontWeight.w800, fontSize: 14)),
          ],
        ),
      );
}

class _Leg extends StatelessWidget {
  const _Leg({required this.leg, required this.index});
  final SlipLeg leg;
  final int index;

  String get time {
    final date = leg.startsAt;
    if (date == null) return 'Start time unavailable';
    return '${date.day}/${date.month}/${date.year} · ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) => Opacity(
        opacity: leg.isActive ? 1 : .58,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 24,
                height: 24,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: const Color(0xFFE4F7EC), shape: BoxShape.circle, border: Border.all(color: const Color(0xFFBDE8CE))),
                child: Text('${index + 1}', style: const TextStyle(color: Color(0xFF08713F), fontSize: 10, fontWeight: FontWeight.w800)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.only(bottom: 16),
                  decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFEDF0EC)))),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                            decoration: BoxDecoration(color: const Color(0xFFE8F6ED), borderRadius: BorderRadius.circular(5)),
                            child: Text(leg.sport.toUpperCase(), style: const TextStyle(color: Color(0xFF277149), fontSize: 8, fontWeight: FontWeight.w800)),
                          ),
                          const SizedBox(width: 7),
                          Expanded(child: Text('${leg.region}${leg.region.isEmpty ? '' : ' · '}${leg.league}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xFF869089), fontSize: 9))),
                          if (leg.isLive) const Text('●  LIVE', style: TextStyle(color: green, fontSize: 8, fontWeight: FontWeight.w800)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(leg.event, style: const TextStyle(color: ink, fontWeight: FontWeight.w800, fontSize: 14)),
                      const SizedBox(height: 2),
                      Text(time, style: const TextStyle(color: Color(0xFF929B95), fontSize: 9)),
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.fromLTRB(11, 8, 8, 8),
                        decoration: BoxDecoration(color: cream, borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFE2E7E1))),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(leg.market, style: const TextStyle(color: Color(0xFF87918B), fontSize: 9)),
                                  const SizedBox(height: 2),
                                  Text(leg.selection, style: const TextStyle(color: Color(0xFF344139), fontSize: 11, fontWeight: FontWeight.w700)),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 8),
                              decoration: BoxDecoration(color: const Color(0xFFE2F6EA), borderRadius: BorderRadius.circular(8)),
                              child: Text(leg.odds == 0 ? '—' : leg.odds.toStringAsFixed(2), style: const TextStyle(color: Color(0xFF08713F), fontWeight: FontWeight.w800, fontSize: 12)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      );
}
