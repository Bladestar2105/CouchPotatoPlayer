cat << 'PATCH' > settings_patch.diff
<<<<<<< SEARCH
        {/* Theme Mode */}
        {Platform.OS === 'ios' && !Platform.isTV ? (
          <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]} onPress={handleActionSheetTheme}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Theme Mode</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{themeMode}</Text>
            </View>
            <Text style={{ color: colors.primary }}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Theme Mode</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{themeMode}</Text>
            </View>
            <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
              <Picker selectedValue={themeMode} onValueChange={(val: ThemeMode) => setThemeMode(val)} style={[styles.picker, { color: colors.text }]} dropdownIconColor={colors.text}>
                <Picker.Item label="Dark" value="dark" />
                <Picker.Item label="OLED Black" value="oled" />
                <Picker.Item label="Light" value="light" />
              </Picker>
            </View>
          </View>
        )}

        {/* Buffer Size */}
        {Platform.OS === 'ios' && !Platform.isTV ? (
          <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]} onPress={handleActionSheetBuffer}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Streaming Buffer Size</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{bufferSize} MB</Text>
            </View>
            <Text style={{ color: colors.primary }}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Streaming Buffer Size</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{bufferSize} MB</Text>
            </View>
            <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
              <Picker selectedValue={bufferSize} onValueChange={(val: number) => setBufferSize(val)} style={[styles.picker, { color: colors.text }]} dropdownIconColor={colors.text}>
                <Picker.Item label="8 MB" value={8} />
                <Picker.Item label="16 MB" value={16} />
                <Picker.Item label="32 MB" value={32} />
                <Picker.Item label="64 MB" value={64} />
                <Picker.Item label="128 MB" value={128} />
              </Picker>
            </View>
          </View>
        )}

        {/* Update Interval */}
        {Platform.OS === 'ios' && !Platform.isTV ? (
          <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]} onPress={handleActionSheetUpdateInterval}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Update Interval</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{updateInterval} Hours</Text>
            </View>
            <Text style={{ color: colors.primary }}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Update Interval</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{updateInterval} Hours</Text>
            </View>
            <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
              <Picker selectedValue={updateInterval} onValueChange={(val: number) => handleSetUpdateInterval(val)} style={[styles.picker, { color: colors.text }]} dropdownIconColor={colors.text}>
                <Picker.Item label="12 Hours" value={12} />
                <Picker.Item label="24 Hours" value={24} />
                <Picker.Item label="48 Hours" value={48} />
              </Picker>
            </View>
          </View>
        )}
=======
        {/* Theme Mode */}
        {Platform.OS === 'ios' && !Platform.isTV ? (
          <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]} onPress={handleActionSheetTheme}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Theme Mode</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{themeMode}</Text>
            </View>
            <Text style={{ color: colors.primary }}>Edit</Text>
          </TouchableOpacity>
        ) : Platform.isTV ? (
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
            onPress={() => {
              const themes: ThemeMode[] = ['dark', 'oled', 'light'];
              const nextIndex = (themes.indexOf(themeMode) + 1) % themes.length;
              setThemeMode(themes[nextIndex]);
            }}
          >
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Theme Mode</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{themeMode}</Text>
            </View>
            <Text style={{ color: colors.primary }}>Toggle</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Theme Mode</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{themeMode}</Text>
            </View>
            <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
              <Picker selectedValue={themeMode} onValueChange={(val: ThemeMode) => setThemeMode(val)} style={[styles.picker, { color: colors.text }]} dropdownIconColor={colors.text}>
                <Picker.Item label="Dark" value="dark" />
                <Picker.Item label="OLED Black" value="oled" />
                <Picker.Item label="Light" value="light" />
              </Picker>
            </View>
          </View>
        )}

        {/* Buffer Size */}
        {Platform.OS === 'ios' && !Platform.isTV ? (
          <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]} onPress={handleActionSheetBuffer}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Streaming Buffer Size</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{bufferSize} MB</Text>
            </View>
            <Text style={{ color: colors.primary }}>Edit</Text>
          </TouchableOpacity>
        ) : Platform.isTV ? (
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
            onPress={() => {
              const sizes = [8, 16, 32, 64, 128];
              const nextIndex = (sizes.indexOf(bufferSize) + 1) % sizes.length;
              setBufferSize(sizes[nextIndex]);
            }}
          >
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Streaming Buffer Size</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{bufferSize} MB</Text>
            </View>
            <Text style={{ color: colors.primary }}>Toggle</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Streaming Buffer Size</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{bufferSize} MB</Text>
            </View>
            <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
              <Picker selectedValue={bufferSize} onValueChange={(val: number) => setBufferSize(val)} style={[styles.picker, { color: colors.text }]} dropdownIconColor={colors.text}>
                <Picker.Item label="8 MB" value={8} />
                <Picker.Item label="16 MB" value={16} />
                <Picker.Item label="32 MB" value={32} />
                <Picker.Item label="64 MB" value={64} />
                <Picker.Item label="128 MB" value={128} />
              </Picker>
            </View>
          </View>
        )}

        {/* Update Interval */}
        {Platform.OS === 'ios' && !Platform.isTV ? (
          <TouchableOpacity style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]} onPress={handleActionSheetUpdateInterval}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Update Interval</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{updateInterval} Hours</Text>
            </View>
            <Text style={{ color: colors.primary }}>Edit</Text>
          </TouchableOpacity>
        ) : Platform.isTV ? (
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}
            onPress={() => {
              const intervals = [12, 24, 48];
              const nextIndex = (intervals.indexOf(updateInterval) + 1) % intervals.length;
              handleSetUpdateInterval(intervals[nextIndex]);
            }}
          >
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Update Interval</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{updateInterval} Hours</Text>
            </View>
            <Text style={{ color: colors.primary }}>Toggle</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.divider }]}>
            <View style={styles.tileLeft}>
              <Text style={[styles.tileTitle, { color: colors.text }]}>Update Interval</Text>
              <Text style={[styles.tileSubtitle, { color: colors.textSecondary }]}>{updateInterval} Hours</Text>
            </View>
            <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
              <Picker selectedValue={updateInterval} onValueChange={(val: number) => handleSetUpdateInterval(val)} style={[styles.picker, { color: colors.text }]} dropdownIconColor={colors.text}>
                <Picker.Item label="12 Hours" value={12} />
                <Picker.Item label="24 Hours" value={24} />
                <Picker.Item label="48 Hours" value={48} />
              </Picker>
            </View>
          </View>
        )}
>>>>>>> REPLACE
PATCH
