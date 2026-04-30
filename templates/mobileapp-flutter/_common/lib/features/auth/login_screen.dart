import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _submitEmail() async {
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(authControllerProvider).signIn(_email.text.trim(), _password.text);
      if (mounted) context.go('/home');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitGoogle() async {
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(authControllerProvider).signInWithGoogle();
      if (mounted) context.go('/home');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign in')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email'), keyboardType: TextInputType.emailAddress),
            const SizedBox(height: 12),
            TextField(controller: _password, decoration: const InputDecoration(labelText: 'Password'), obscureText: true),
            const SizedBox(height: 16),
            if (_error != null) Text(_error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 8),
            FilledButton(onPressed: _loading ? null : _submitEmail, child: Text(_loading ? 'Signing in…' : 'Sign in')),
            const SizedBox(height: 12),
            const Row(children: [
              Expanded(child: Divider()),
              Padding(padding: EdgeInsets.symmetric(horizontal: 8), child: Text('or', style: TextStyle(fontSize: 12))),
              Expanded(child: Divider()),
            ]),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: _loading ? null : _submitGoogle,
              child: const Text('Continue with Google'),
            ),
            const SizedBox(height: 12),
            TextButton(onPressed: () => context.go('/signup'), child: const Text('No account? Sign up')),
          ],
        ),
      ),
    );
  }
}
