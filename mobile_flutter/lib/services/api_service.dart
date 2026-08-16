import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/slip.dart';

class SlipApiException implements Exception {
  const SlipApiException(this.message);
  final String message;

  @override
  String toString() => message;
}

class SlipApi {
  SlipApi({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _baseUrl = baseUrl ??
            const String.fromEnvironment(
              'API_BASE_URL',
              defaultValue: 'http://10.0.2.2:8080',
            );

  final http.Client _client;
  final String _baseUrl;

  Future<DecodedSlip> decode(String code) async {
    final response = await _client
        .post(
          Uri.parse('$_baseUrl/api/v1/slips/decode'),
          headers: const {'Content-Type': 'application/json'},
          body: jsonEncode({'code': code.trim().toUpperCase()}),
        )
        .timeout(const Duration(seconds: 12));

    final payload = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final error = payload['error'] as Map<String, dynamic>?;
      throw SlipApiException(
        error?['message'] as String? ?? 'The slip could not be loaded.',
      );
    }
    return DecodedSlip.fromJson(payload);
  }

  void close() => _client.close();
}
