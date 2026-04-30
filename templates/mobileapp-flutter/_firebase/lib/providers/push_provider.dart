import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class PushController {
  PushController(this._fm);
  final FirebaseMessaging _fm;

  Future<String?> requestPermissionAndGetToken() async {
    final settings = await _fm.requestPermission(alert: true, badge: true, sound: true);
    if (settings.authorizationStatus == AuthorizationStatus.denied) return null;
    return _fm.getToken();
  }

  Stream<String> get tokenRefresh => _fm.onTokenRefresh;
}

final pushControllerProvider = Provider<PushController>((_) {
  return PushController(FirebaseMessaging.instance);
});
