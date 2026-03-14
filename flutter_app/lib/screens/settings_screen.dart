import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import 'welcome_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F0F),
      appBar: AppBar(
        title: const Text('Settings', style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF1C1C1E),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Consumer<AppProvider>(
        builder: (context, provider, child) {
          return ListView(
            padding: const EdgeInsets.all(16.0),
            children: [
              if (provider.config != null)
                ListTile(
                  tileColor: const Color(0xFF1C1C1E),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  title: const Text('Current Provider', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  subtitle: Text(provider.config!.name, style: const TextStyle(color: Colors.grey)),
                  trailing: const Icon(Icons.dns, color: Colors.blue),
                ),
              const SizedBox(height: 16),
              ListTile(
                tileColor: const Color(0xFF1C1C1E),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                title: const Text('Parental Control PIN', style: TextStyle(color: Colors.white)),
                subtitle: Text(provider.pin != null ? 'PIN is set' : 'No PIN set', style: const TextStyle(color: Colors.grey)),
                trailing: const Icon(Icons.lock, color: Colors.blue),
                onTap: () {
                  Navigator.pushNamed(context, '/pin_setup');
                },
              ),
              const SizedBox(height: 16),
              if (provider.pin != null) ...[
                ListTile(
                  tileColor: const Color(0xFF1C1C1E),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  title: const Text('Show Adult Content', style: TextStyle(color: Colors.white)),
                  trailing: Switch(
                    value: provider.showAdult,
                    activeThumbColor: Colors.blue,
                    onChanged: (value) async {
                      if (value) {
                        // Request PIN
                        String? enteredPin = await showDialog<String>(
                          context: context,
                          builder: (dialogContext) {
                            final pinController = TextEditingController();
                            return AlertDialog(
                              backgroundColor: const Color(0xFF2C2C2E),
                              title: const Text('Enter PIN', style: TextStyle(color: Colors.white)),
                              content: TextField(
                                controller: pinController,
                                obscureText: true,
                                keyboardType: TextInputType.number,
                                maxLength: 4,
                                style: const TextStyle(color: Colors.white),
                                decoration: const InputDecoration(counterText: ''),
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(dialogContext),
                                  child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
                                ),
                                TextButton(
                                  onPressed: () => Navigator.pop(dialogContext, pinController.text),
                                  child: const Text('Submit', style: TextStyle(color: Colors.blue)),
                                ),
                              ],
                            );
                          },
                        );

                        if (!context.mounted) return;

                        if (enteredPin == provider.pin) {
                          await provider.setShowAdult(true);
                        } else if (enteredPin != null) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Incorrect PIN')));
                        }
                      } else {
                        await provider.setShowAdult(false);
                      }
                    },
                  ),
                ),
                const SizedBox(height: 16),
              ],
              ListTile(
                tileColor: const Color(0xFF1C1C1E),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                title: const Text('Logout / Clear Data', style: TextStyle(color: Colors.redAccent)),
                leading: const Icon(Icons.logout, color: Colors.redAccent),
                onTap: () async {
                  final confirmed = await showDialog<bool>(
                    context: context,
                    builder: (context) => AlertDialog(
                      backgroundColor: const Color(0xFF2C2C2E),
                      title: const Text('Logout', style: TextStyle(color: Colors.white)),
                      content: const Text('Are you sure you want to clear your data and logout?', style: TextStyle(color: Colors.grey)),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context, false),
                          child: const Text('Cancel', style: TextStyle(color: Colors.white)),
                        ),
                        TextButton(
                          onPressed: () => Navigator.pop(context, true),
                          child: const Text('Logout', style: TextStyle(color: Colors.redAccent)),
                        ),
                      ],
                    ),
                  );

                  if (confirmed == true) {
                    await provider.clearState();
                    if (!context.mounted) return;
                    Navigator.pushAndRemoveUntil(
                      context,
                      MaterialPageRoute(builder: (_) => const WelcomeScreen()),
                      (route) => false,
                    );
                  }
                },
              ),
            ],
          );
        },
      ),
    );
  }
}
