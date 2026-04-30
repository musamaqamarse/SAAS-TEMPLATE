import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_sign_in/google_sign_in.dart';

class AppUser {
  final String id;
  final String? email;
  AppUser({required this.id, this.email});
  factory AppUser.fromFirebase(User u) => AppUser(id: u.uid, email: u.email);
}

class SignUpResult {
  final bool needsConfirmation;
  SignUpResult({required this.needsConfirmation});
}

class AuthController {
  AuthController(this._auth);
  final FirebaseAuth _auth;

  Future<void> signIn(String email, String password) async {
    await _auth.signInWithEmailAndPassword(email: email, password: password);
  }

  Future<SignUpResult> signUp(String email, String password) async {
    await _auth.createUserWithEmailAndPassword(email: email, password: password);
    return SignUpResult(needsConfirmation: false);
  }

  Future<void> signInWithGoogle() async {
    final googleSignIn = GoogleSignIn();
    final account = await googleSignIn.signIn();
    if (account == null) throw Exception('Google sign-in cancelled');
    final googleAuth = await account.authentication;
    final credential = GoogleAuthProvider.credential(
      idToken: googleAuth.idToken,
      accessToken: googleAuth.accessToken,
    );
    await _auth.signInWithCredential(credential);
  }

  Future<void> signOut() async {
    await GoogleSignIn().signOut();
    await _auth.signOut();
  }
}

final firebaseAuthProvider = Provider<FirebaseAuth>((_) => FirebaseAuth.instance);

final authControllerProvider = Provider<AuthController>((ref) {
  return AuthController(ref.watch(firebaseAuthProvider));
});

final authStateProvider = StreamProvider<User?>((ref) {
  return ref.watch(firebaseAuthProvider).authStateChanges();
});

final currentUserProvider = Provider<AppUser?>((ref) {
  final user = ref.watch(authStateProvider).asData?.value;
  return user == null ? null : AppUser.fromFirebase(user);
});
