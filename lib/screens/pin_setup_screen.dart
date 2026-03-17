import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';

class PinSetupScreen extends StatefulWidget {
  const PinSetupScreen({Key? key}) : super(key: key);

  @override
  State<PinSetupScreen> createState() => _PinSetupScreenState();
}

class _PinSetupScreenState extends State<PinSetupScreen> {
  final TextEditingController _pinController = TextEditingController();
  final TextEditingController _confirmController = TextEditingController();
  String _error = '';
  bool _isSettingPin = false;

  @override
  void initState() {
    super.initState();
    final provider = Provider.of<AppProvider>(context, listen: false);
    _isSettingPin = provider.pin == null;
  }

  @override
  void dispose() {
    _pinController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  void _savePin() async {
    final provider = Provider.of<AppProvider>(context, listen: false);

    if (_isSettingPin) {
      if (_pinController.text.length != 4) {
        setState(() => _error = 'PIN must be 4 digits');
        return;
      }
      if (_pinController.text != _confirmController.text) {
        setState(() => _error = 'PINs do not match');
        return;
      }

      await provider.setPin(_pinController.text);
      if (mounted) {
         Navigator.pop(context);
      }
    } else {
      // Verify existing PIN to change or remove
      if (_pinController.text != provider.pin) {
        setState(() => _error = 'Incorrect PIN');
        return;
      }

      // If verified, either remove or switch to setting new
      if (_confirmController.text.isEmpty) {
         // remove PIN
         await provider.setPin(null);
         await provider.setShowAdult(false);
         if (mounted) {
           Navigator.pop(context);
         }
      } else {
         // set new
         if (_confirmController.text.length != 4) {
           setState(() => _error = 'New PIN must be 4 digits');
           return;
         }
         await provider.setPin(_confirmController.text);
         if (mounted) {
           Navigator.pop(context);
         }
      }
    }
  }

  Widget _buildInput(String label, TextEditingController controller) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: TextField(
        controller: controller,
        autofocus: true,
        obscureText: true,
        keyboardType: TextInputType.number,
        maxLength: 4,
        style: const TextStyle(color: Colors.white, fontSize: 18, letterSpacing: 8),
        textAlign: TextAlign.center,
        decoration: InputDecoration(
          counterText: '',
          labelText: label,
          labelStyle: const TextStyle(color: Colors.grey, letterSpacing: 1),
          filled: true,
          fillColor: const Color(0xFF2C2C2E),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F0F),
      appBar: AppBar(
        title: const Text('Parental Control PIN', style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF1C1C1E),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 400),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFF1C1C1E),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  _isSettingPin ? Icons.lock_outline : Icons.lock_open,
                  color: Colors.blue,
                  size: 48,
                ),
                const SizedBox(height: 16),
                Text(
                  _isSettingPin ? 'Set New PIN' : 'Manage PIN',
                  style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  _isSettingPin
                      ? 'Enter a 4-digit PIN to restrict adult content.'
                      : 'Enter your current PIN to remove or change it. Leave new PIN empty to remove.',
                  style: const TextStyle(color: Colors.grey, fontSize: 14),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),

                if (_error.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Text(_error, style: const TextStyle(color: Colors.redAccent, fontSize: 14)),
                  ),

                if (_isSettingPin) ...[
                  _buildInput('New PIN', _pinController),
                  _buildInput('Confirm PIN', _confirmController),
                ] else ...[
                  _buildInput('Current PIN', _pinController),
                  _buildInput('New PIN (Optional)', _confirmController),
                ],

                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _savePin,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Save', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
