import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../providers/auth_provider.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});
  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  String? _error;
  String? _info;

  Future<void> _submit() async {
    setState(() { _loading = true; _error = null; _info = null; });
    try {
      final result = await ref.read(authControllerProvider).signUp(_email.text.trim(), _password.text);
      if (!mounted) return;
      if (result.needsConfirmation) {
        setState(() => _info = 'Check your email to confirm your account.');
      } else {
        context.go('/home');
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email'), keyboardType: TextInputType.emailAddress),
            const SizedBox(height: 12),
            TextField(controller: _password, decoration: const InputDecoration(labelText: 'Password (min 6 chars)'), obscureText: true),
            const SizedBox(height: 16),
            if (_error != null) Text(_error!, style: const TextStyle(color: Colors.red)),
            if (_info != null) Text(_info!, style: const TextStyle(color: Colors.green)),
            const SizedBox(height: 16),
            FilledButton(onPressed: _loading ? null : _submit, child: Text(_loading ? 'Creating…' : 'Create account')),
            const SizedBox(height: 12),
            TextButton(onPressed: () => context.go('/login'), child: const Text('Already have an account? Log in')),
          ],
        ),
      ),
    );
  }
}
