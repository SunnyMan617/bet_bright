import 'package:flutter/material.dart';

import 'models/slip.dart';
import 'services/api_service.dart';
import 'widgets/slip_view.dart';

void main() => runApp(const BetBridgeApp());

class BetBridgeApp extends StatelessWidget {
  const BetBridgeApp({super.key, this.api});
  final SlipApi? api;

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'BetBridge',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF15A15C), surface: const Color(0xFFF4F5EF)),
          scaffoldBackgroundColor: const Color(0xFFF4F5EF),
        ),
        home: SlipLookupPage(api: api ?? SlipApi()),
      );
}

class SlipLookupPage extends StatefulWidget {
  const SlipLookupPage({super.key, required this.api});
  final SlipApi api;

  @override
  State<SlipLookupPage> createState() => _SlipLookupPageState();
}

class _SlipLookupPageState extends State<SlipLookupPage> {
  final _controller = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  DecodedSlip? _slip;
  String? _error;
  bool _loading = false;

  @override
  void dispose() {
    _controller.dispose();
    widget.api.close();
    super.dispose();
  }

  Future<void> _decode() async {
    if (!_formKey.currentState!.validate()) return;
    FocusManager.instance.primaryFocus?.unfocus();
    setState(() { _loading = true; _error = null; _slip = null; });
    try {
      final slip = await widget.api.decode(_controller.text);
      if (mounted) setState(() => _slip = slip);
    } catch (error) {
      if (mounted) setState(() => _error = error is SlipApiException ? error.message : 'Betway is temporarily unreachable.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          backgroundColor: const Color(0xFFF4F5EF),
          surfaceTintColor: Colors.transparent,
          title: const Row(children: [
            _BrandMark(),
            SizedBox(width: 10),
            Text('BetBridge', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: -.5)),
          ]),
        ),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(18, 22, 18, 40),
            children: [
              const Text('BOOKING CODES, MADE TRANSPARENT', style: TextStyle(color: Color(0xFF08713F), fontWeight: FontWeight.w800, fontSize: 10, letterSpacing: 1.3)),
              const SizedBox(height: 10),
              const Text('Inspect every leg.', style: TextStyle(color: Color(0xFF071A0F), fontWeight: FontWeight.w900, fontSize: 32, letterSpacing: -1.5)),
              const SizedBox(height: 8),
              const Text('Load a Betway Nigeria code and compare every match, market, selection and price.', style: TextStyle(color: Color(0xFF69736D), height: 1.5, fontSize: 14)),
              const SizedBox(height: 26),
              Form(
                key: _formKey,
                child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  TextFormField(
                    controller: _controller,
                    textCapitalization: TextCapitalization.characters,
                    autocorrect: false,
                    decoration: InputDecoration(
                      labelText: 'Betway booking code',
                      hintText: 'BW69727F3B',
                      prefixIcon: const Icon(Icons.fingerprint_rounded),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    validator: (value) => value == null || !RegExp(r'^[a-zA-Z0-9]{5,20}$').hasMatch(value.trim()) ? 'Enter a valid Betway booking code' : null,
                    onFieldSubmitted: (_) => _decode(),
                  ),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: _loading ? null : _decode,
                    icon: _loading ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.bolt_rounded),
                    label: Text(_loading ? 'Talking to Betway…' : 'Decode live slip'),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF071A0F),
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(52),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
                    ),
                  ),
                ]),
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(13),
                  decoration: BoxDecoration(color: const Color(0xFFFFEDE8), borderRadius: BorderRadius.circular(12)),
                  child: Row(children: [
                    const Icon(Icons.error_outline_rounded, color: Color(0xFF9E3A27)),
                    const SizedBox(width: 10),
                    Expanded(child: Text(_error!, style: const TextStyle(color: Color(0xFF84301F), fontSize: 12))),
                  ]),
                ),
              ],
              if (_slip != null) ...[
                const SizedBox(height: 28),
                const Row(children: [
                  Icon(Icons.verified_rounded, size: 17, color: Color(0xFF15A15C)),
                  SizedBox(width: 6),
                  Text('READ FROM BETWAY', style: TextStyle(color: Color(0xFF08713F), fontWeight: FontWeight.w800, fontSize: 10, letterSpacing: 1.1)),
                ]),
                const SizedBox(height: 10),
                SlipView(slip: _slip!),
              ],
            ],
          ),
        ),
      );
}

class _BrandMark extends StatelessWidget {
  const _BrandMark();
  @override
  Widget build(BuildContext context) => Container(
        width: 36,
        height: 36,
        decoration: const BoxDecoration(
          color: Color(0xFF071A0F),
          borderRadius: BorderRadius.only(topLeft: Radius.circular(11), topRight: Radius.circular(11), bottomRight: Radius.circular(11), bottomLeft: Radius.circular(4)),
        ),
        child: const Icon(Icons.hub_rounded, color: Color(0xFF72E7A3), size: 20),
      );
}
