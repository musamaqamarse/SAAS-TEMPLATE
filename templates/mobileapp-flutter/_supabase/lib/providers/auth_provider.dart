import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class AppUser {
  final String id;
  final String? email;
  AppUser({required this.id, this.email});
  factory AppUser.fromSupabase(User u) => AppUser(id: u.id, email: u.email);
}

class SignUpResult {
  final bool needsConfirmation;
  SignUpResult({required this.needsConfirmation});
}

class AuthController {
  AuthController(this._client);
  final SupabaseClient _client;

  Future<void> signIn(String email, String password) async {
    await _client.auth.signInWithPassword(email: email, password: password);
  }

  Future<SignUpResult> signUp(String email, String password) async {
    final res = await _client.auth.signUp(email: email, password: password);
    return SignUpResult(needsConfirmation: res.session == null);
  }

  Future<void> signInWithGoogle() async {
    final googleSignIn = GoogleSignIn();
    final account = await googleSignIn.signIn();
    if (account == null) throw Exception('Google sign-in cancelled');
    final googleAuth = await account.authentication;
    await _client.auth.signInWithIdToken(
      provider: OAuthProvider.google,
      idToken: googleAuth.idToken!,
      accessToken: googleAuth.accessToken,
    );
  }

  Future<void> signOut() async {
    await GoogleSignIn().signOut();
    await _client.auth.signOut();
  }
}

final supabaseClientProvider = Provider<SupabaseClient>((_) => Supabase.instance.client);

final authControllerProvider = Provider<AuthController>((ref) {
  return AuthController(ref.watch(supabaseClientProvider));
});

final authStateProvider = StreamProvider<AuthState>((ref) {
  return ref.watch(supabaseClientProvider).auth.onAuthStateChange;
});

final currentUserProvider = Provider<AppUser?>((ref) {
  final state = ref.watch(authStateProvider).asData?.value;
  final user = state?.session?.user ?? Supabase.instance.client.auth.currentUser;
  return user == null ? null : AppUser.fromSupabase(user);
});
