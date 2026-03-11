import { Dirs, FileSystem } from 'react-native-file-access';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isWeb = Platform.OS === 'web';

export const saveLargeData = async (key: string, data: any) => {
  try {
    const stringData = JSON.stringify(data);
    if (isWeb) {
      await AsyncStorage.setItem(key, stringData);
    } else {
      const path = `${Dirs.DocumentDir}/${key}`;
      await FileSystem.writeFile(path, stringData, 'utf8');
    }
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
  }
};

export const loadLargeData = async (key: string) => {
  try {
    if (isWeb) {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } else {
      const path = `${Dirs.DocumentDir}/${key}`;
      if (await FileSystem.exists(path)) {
        const data = await FileSystem.readFile(path, 'utf8');
        return data ? JSON.parse(data) : null;
      }
    }
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
  }
  return null;
};

export const clearLargeData = async (key: string) => {
  try {
    if (isWeb) {
      await AsyncStorage.removeItem(key);
    } else {
      const path = `${Dirs.DocumentDir}/${key}`;
      if (await FileSystem.exists(path)) {
        await FileSystem.unlink(path);
      }
    }
  } catch (error) {
    console.error(`Error clearing ${key}:`, error);
  }
};
