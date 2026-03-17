import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import '../providers/settings_provider.dart';
import '../models/iptv.dart';
import 'welcome_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  IconData _getIconData(String? iconName) {
    switch (iconName) {
      case 'tv': return Icons.tv;
      case 'movie': return Icons.movie;
      case 'star': return Icons.star;
      case 'public': return Icons.public;
      case 'dns': return Icons.dns;
      case 'live_tv': return Icons.live_tv;
      case 'sports_soccer': return Icons.sports_soccer;
      case 'music_note': return Icons.music_note;
      case 'child_care': return Icons.child_care;
      case 'business': return Icons.business;
      default: return Icons.dns;
    }
  }

  Future<void> _showProviderDialog(BuildContext context, {PlayerConfig? existingProvider}) async {
    final nameController = TextEditingController(text: existingProvider?.name ?? '');
    final serverUrlController = TextEditingController(text: existingProvider?.serverUrl ?? '');
    final usernameController = TextEditingController(text: existingProvider?.username ?? '');
    final passwordController = TextEditingController(text: existingProvider?.password ?? '');
    String selectedType = existingProvider?.type ?? 'xtream';
    String selectedIcon = existingProvider?.icon ?? 'dns';
    bool loading = false;
    String error = '';

    final predefinedIcons = [
      'tv', 'movie', 'star', 'public', 'dns', 'live_tv', 'sports_soccer', 'music_note', 'child_care', 'business'
    ];

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            return AlertDialog(
              backgroundColor: const Color(0xFF1C1C1E),
              title: Text(existingProvider == null ? 'Add Provider' : 'Edit Provider', style: const TextStyle(color: Colors.white)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (existingProvider == null)
                      Row(
                        children: [
                          Expanded(
                            child: RadioListTile<String>(
                              title: const Text('Xtream', style: TextStyle(color: Colors.white, fontSize: 14)),
                              value: 'xtream',
                              groupValue: selectedType,
                              onChanged: (val) => setStateDialog(() => selectedType = val!),
                              activeColor: Colors.blue,
                              contentPadding: EdgeInsets.zero,
                            ),
                          ),
                          Expanded(
                            child: RadioListTile<String>(
                              title: const Text('M3U', style: TextStyle(color: Colors.white, fontSize: 14)),
                              value: 'm3u',
                              groupValue: selectedType,
                              onChanged: (val) => setStateDialog(() => selectedType = val!),
                              activeColor: Colors.blue,
                              contentPadding: EdgeInsets.zero,
                            ),
                          ),
                        ],
                      ),
                    TextField(
                      autofocus: true,
                      controller: nameController,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(labelText: 'Name', labelStyle: TextStyle(color: Colors.grey)),
                    ),
                    TextField(
                      controller: serverUrlController,
                      style: const TextStyle(color: Colors.white),
                      decoration: const InputDecoration(labelText: 'Server URL', labelStyle: TextStyle(color: Colors.grey)),
                    ),
                    if (selectedType == 'xtream') ...[
                      TextField(
                        controller: usernameController,
                        style: const TextStyle(color: Colors.white),
                        decoration: const InputDecoration(labelText: 'Username', labelStyle: TextStyle(color: Colors.grey)),
                      ),
                      TextField(
                        controller: passwordController,
                        style: const TextStyle(color: Colors.white),
                        obscureText: true,
                        decoration: const InputDecoration(labelText: 'Password', labelStyle: TextStyle(color: Colors.grey)),
                      ),
                    ],
                    const SizedBox(height: 16),
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text('Select Icon:', style: TextStyle(color: Colors.grey)),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: predefinedIcons.map((iconName) {
                        return GestureDetector(
                          onTap: () => setStateDialog(() => selectedIcon = iconName),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: selectedIcon == iconName ? Colors.blue.withValues(alpha: 0.3) : Colors.transparent,
                              border: Border.all(color: selectedIcon == iconName ? Colors.blue : Colors.grey),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(_getIconData(iconName), color: Colors.white),
                          ),
                        );
                      }).toList(),
                    ),
                    if (error.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Text(error, style: const TextStyle(color: Colors.red)),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: loading ? null : () => Navigator.pop(context),
                  child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
                ),
                TextButton(
                  onPressed: loading ? null : () async {
                    if (nameController.text.isEmpty || serverUrlController.text.isEmpty ||
                        (selectedType == 'xtream' && (usernameController.text.isEmpty || passwordController.text.isEmpty))) {
                      setStateDialog(() => error = 'Please fill all fields');
                      return;
                    }

                    setStateDialog(() { loading = true; error = ''; });

                    final newConfig = PlayerConfig(
                      id: existingProvider?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
                      name: nameController.text.trim(),
                      type: selectedType,
                      serverUrl: serverUrlController.text.trim(),
                      username: usernameController.text.trim(),
                      password: passwordController.text.trim(),
                      epgUrl: existingProvider?.epgUrl,
                      icon: selectedIcon,
                    );

                    final appProvider = Provider.of<AppProvider>(context, listen: false);
                    await appProvider.addProvider(newConfig);

                    if (appProvider.config?.id == newConfig.id) {
                       await appProvider.setConfig(newConfig);
                    }

                    if (context.mounted) {
                      Navigator.pop(context);
                    }
                  },
                  child: loading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save', style: TextStyle(color: Colors.blue)),
                ),
              ],
            );
          },
        );
      },
    );
  }

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
              const Padding(
                padding: EdgeInsets.only(left: 8, bottom: 8),
                child: Text('Providers', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold, fontSize: 16)),
              ),
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF1C1C1E),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Column(
                  children: [
                    ...provider.providers.map((p) {
                      final isCurrent = provider.config?.id == p.id;
                      return ListTile(
                        leading: Icon(_getIconData(p.icon), color: isCurrent ? Colors.blue : Colors.grey),
                        title: Text(p.name, style: TextStyle(color: isCurrent ? Colors.white : Colors.grey[300], fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal)),
                        subtitle: Text(p.type.toUpperCase(), style: const TextStyle(color: Colors.grey, fontSize: 12)),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              tooltip: 'Edit provider',
                              icon: const Icon(Icons.edit, color: Colors.blue, size: 20),
                              onPressed: () => _showProviderDialog(context, existingProvider: p),
                            ),
                            IconButton(
                              tooltip: 'Delete provider',
                              icon: const Icon(Icons.delete, color: Colors.redAccent, size: 20),
                              onPressed: () async {
                                final confirm = await showDialog<bool>(
                                  context: context,
                                  builder: (c) => AlertDialog(
                                    backgroundColor: const Color(0xFF2C2C2E),
                                    title: const Text('Delete Provider', style: TextStyle(color: Colors.white)),
                                    content: Text('Are you sure you want to delete ${p.name}?', style: const TextStyle(color: Colors.grey)),
                                    actions: [
                                      TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel', style: TextStyle(color: Colors.grey))),
                                      TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('Delete', style: TextStyle(color: Colors.redAccent))),
                                    ],
                                  ),
                                );
                                if (confirm == true && context.mounted) {
                                  await provider.removeProvider(p.id);
                                  if (provider.providers.isEmpty && context.mounted) {
                                    Navigator.pushAndRemoveUntil(
                                      context,
                                      MaterialPageRoute(builder: (_) => const WelcomeScreen()),
                                      (route) => false,
                                    );
                                  }
                                }
                              },
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                    if (provider.providers.length < 10)
                      ListTile(
                        leading: const Icon(Icons.add, color: Colors.blue),
                        title: const Text('Add Provider', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
                        onTap: () => _showProviderDialog(context),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              const Padding(
                padding: EdgeInsets.only(left: 8, bottom: 8),
                child: Text('General', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold, fontSize: 16)),
              ),
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
              ListTile(
                tileColor: const Color(0xFF1C1C1E),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                title: const Text('Theme Mode', style: TextStyle(color: Colors.white)),
                subtitle: Text(provider.themeMode, style: const TextStyle(color: Colors.grey)),
                trailing: DropdownButton<String>(
                  value: provider.themeMode,
                  dropdownColor: const Color(0xFF2C2C2E),
                  underline: const SizedBox(),
                  style: const TextStyle(color: Colors.white),
                  items: const [
                    DropdownMenuItem(value: 'dark', child: Text('Dark')),
                    DropdownMenuItem(value: 'oled', child: Text('OLED Black')),
                    DropdownMenuItem(value: 'light', child: Text('Light')),
                  ],
                  onChanged: (val) {
                    if (val != null) provider.setThemeMode(val);
                  },
                ),
              ),
              const SizedBox(height: 16),
              Consumer<SettingsProvider>(
                builder: (context, settings, child) {
                  return Column(
                    children: [
                      ListTile(
                        tileColor: const Color(0xFF1C1C1E),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        title: const Text('Streaming Buffer Size', style: TextStyle(color: Colors.white)),
                        subtitle: Text('${settings.bufferSize} MB', style: const TextStyle(color: Colors.grey)),
                        trailing: DropdownButton<int>(
                          value: settings.bufferSize,
                          dropdownColor: const Color(0xFF2C2C2E),
                          underline: const SizedBox(),
                          style: const TextStyle(color: Colors.white),
                          items: const [
                            DropdownMenuItem(value: 8, child: Text('8 MB')),
                            DropdownMenuItem(value: 16, child: Text('16 MB')),
                            DropdownMenuItem(value: 32, child: Text('32 MB')),
                            DropdownMenuItem(value: 64, child: Text('64 MB')),
                            DropdownMenuItem(value: 128, child: Text('128 MB')),
                          ],
                          onChanged: (val) {
                            if (val != null) settings.setBufferSize(val);
                          },
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                  );
                },
              ),
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
                                autofocus: true,
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
