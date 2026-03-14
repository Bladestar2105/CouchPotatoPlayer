import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../services/xtream_service.dart';
import '../models/iptv.dart';
import 'home_screen.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({Key? key}) : super(key: key);

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  String type = 'xtream';
  final nameController = TextEditingController();
  final serverUrlController = TextEditingController();
  final usernameController = TextEditingController();
  final passwordController = TextEditingController();
  final epgUrlController = TextEditingController();

  bool loading = false;
  String error = '';

  @override
  void dispose() {
    nameController.dispose();
    serverUrlController.dispose();
    usernameController.dispose();
    passwordController.dispose();
    epgUrlController.dispose();
    super.dispose();
  }

  Future<void> handleLogin() async {
    final name = nameController.text.trim();
    final serverUrl = serverUrlController.text.trim();
    final username = usernameController.text.trim();
    final password = passwordController.text.trim();
    final epgUrl = epgUrlController.text.trim();

    if (name.isEmpty) {
      setState(() => error = 'Please enter a name for this provider');
      return;
    }

    if (type == 'xtream') {
      if (serverUrl.isEmpty || username.isEmpty || password.isEmpty) {
        setState(() => error = 'Please fill in all fields for Xtream Codes');
        return;
      }
    } else {
      if (serverUrl.isEmpty) {
        setState(() => error = 'Please enter an M3U Playlist URL');
        return;
      }
    }

    setState(() {
      loading = true;
      error = '';
    });

    try {
      if (type == 'xtream') {
        final config = PlayerConfig(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          name: name,
          type: 'xtream',
          serverUrl: serverUrl,
          username: username,
          password: password,
        );

        final xtream = XtreamService(config);

        // 1. Check compatibility
        final isCompatible = await xtream.checkCompatibility();
        if (!isCompatible) {
          setState(() {
            error = 'Server is not compatible with IPTV-Manager (action=cpp failed).';
            loading = false;
          });
          return;
        }

        // 2. Authenticate
        final auth = await xtream.authenticate();
        if (auth['user_info'] != null && auth['user_info']['auth'] == 1) {
          if (mounted) {
            final appProvider = Provider.of<AppProvider>(context, listen: false);
            await appProvider.addProvider(config);
            await appProvider.setConfig(config);

            if (mounted) {
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (_) => const HomeScreen()),
              );
            }
          }
        } else {
          setState(() => error = 'Authentication failed. Check credentials.');
        }
      } else {
        // M3U placeholder logic
        final config = PlayerConfig(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          name: name,
          type: 'm3u',
          serverUrl: serverUrl,
          username: '',
          epgUrl: epgUrl,
        );

        if (mounted) {
          final appProvider = Provider.of<AppProvider>(context, listen: false);
          await appProvider.addProvider(config);
          await appProvider.setConfig(config);

          if (mounted) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(builder: (_) => const HomeScreen()),
            );
          }
        }
      }
    } catch (e) {
      setState(() => error = 'Connection error: $e');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Widget buildInput({
    required TextEditingController controller,
    required String hint,
    bool obscureText = false,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      child: TextField(
        controller: controller,
        obscureText: obscureText,
        keyboardType: keyboardType,
        style: const TextStyle(color: Colors.white, fontSize: 16),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: Colors.grey),
          filled: true,
          fillColor: const Color(0xFF2C2C2E),
          contentPadding: const EdgeInsets.all(14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFF3C3C3E)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFF3C3C3E)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Colors.blue),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F0F),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            child: Container(
              width: double.infinity,
              constraints: const BoxConstraints(maxWidth: 600),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF1C1C1E),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'CouchPotatoPlayer',
                      style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Welcome',
                      style: TextStyle(fontSize: 16, color: Colors.grey),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 20),

                    // Type Selector
                    Container(
                      margin: const EdgeInsets.only(bottom: 20),
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2C2C2E),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => type = 'xtream'),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                decoration: BoxDecoration(
                                  color: type == 'xtream' ? Colors.blue : Colors.transparent,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  'Xtream Codes',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: type == 'xtream' ? Colors.white : Colors.grey,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => type = 'm3u'),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                decoration: BoxDecoration(
                                  color: type == 'm3u' ? Colors.blue : Colors.transparent,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  'M3U Playlist',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: type == 'm3u' ? Colors.white : Colors.grey,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    if (error.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 20),
                        child: Text(
                          error,
                          style: const TextStyle(color: Colors.redAccent, fontSize: 16),
                          textAlign: TextAlign.center,
                        ),
                      ),

                    buildInput(controller: nameController, hint: 'Provider Name'),
                    buildInput(
                      controller: serverUrlController,
                      hint: type == 'xtream' ? 'Server URL (http://...)' : 'M3U Playlist URL',
                      keyboardType: TextInputType.url,
                    ),

                    if (type == 'xtream') ...[
                      buildInput(controller: usernameController, hint: 'Username'),
                      buildInput(controller: passwordController, hint: 'Password', obscureText: true),
                    ] else ...[
                      buildInput(
                        controller: epgUrlController,
                        hint: 'XMLTV EPG URL (Optional)',
                        keyboardType: TextInputType.url,
                      ),
                    ],

                    const SizedBox(height: 8),

                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: loading ? null : handleLogin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.blue,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: loading
                            ? const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Text(
                                'Login',
                                style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
