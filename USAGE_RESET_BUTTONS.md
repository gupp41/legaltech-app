# 🔄 Usage Reset Buttons

I've added **4 reset buttons** to your dashboard header to help you reset usage counts and continue using features when you hit limits.

## 📍 **Location**
The buttons are located in the **top-right corner** of your dashboard, next to the "Sign Out" and "Test Upload API" buttons.

## 🎯 **Button Functions**

### **1. 🔄 Reset Usage Counts (Yellow)**
- **What it does**: Resets only `text_extractions` and `analyses_performed` to 0
- **Keeps**: Documents, storage usage, and other data
- **Use case**: When you hit text extraction or AI analysis limits but want to keep your documents

### **2. 🗑️ Reset All Usage (Red)**
- **What it does**: Resets ALL usage counts to 0 (documents, storage, extractions, analyses)
- **Keeps**: Your actual documents, text extractions, and AI analyses
- **Use case**: When you want to reset all usage tracking but keep your work

### **3. 💥 Reset All Data (Purple)**
- **What it does**: **DELETES** all text extractions and AI analyses, resets usage to 0
- **Keeps**: Your uploaded documents (files remain in storage)
- **Use case**: When you want to start completely fresh with no extraction/analysis history
- **⚠️ WARNING**: This action cannot be undone!

### **4. 📅 Reset Current Month (Green)**
- **What it does**: Resets usage for the current month only
- **Keeps**: All your data and work
- **Use case**: When you want to reset monthly limits without affecting other months

## 🧪 **How to Use**

### **Quick Reset for Text Extractions/AI Analysis:**
1. Click the **🔄 Reset Usage Counts** button (yellow)
2. Confirm the action
3. Your text extraction and AI analysis counts will reset to 0
4. You can now continue using these features

### **Complete Fresh Start:**
1. Click the **💥 Reset All Data** button (purple)
2. **⚠️ Read the warning carefully** - this deletes your extractions and analyses
3. Confirm the action
4. All data will be reset and you can start fresh

## 🔍 **What Gets Reset**

| Button | Text Extractions | AI Analyses | Documents | Storage | Usage Tracking |
|--------|------------------|-------------|-----------|---------|----------------|
| 🔄 Reset Usage Counts | ✅ 0 | ✅ 0 | ❌ Keep | ❌ Keep | ✅ Reset |
| 🗑️ Reset All Usage | ✅ 0 | ✅ 0 | ❌ Keep | ✅ 0 | ✅ Reset |
| 💥 Reset All Data | 🗑️ Delete | 🗑️ Delete | ❌ Keep | ✅ 0 | ✅ Reset |
| 📅 Reset Current Month | ✅ 0 | ✅ 0 | ❌ Keep | ❌ Keep | ✅ Reset |

## 🚀 **After Reset**

- ✅ **Text Extractions**: Count resets to 0, you can extract text again
- ✅ **AI Analyses**: Count resets to 0, you can analyze documents again
- ✅ **Usage Display**: Automatically refreshes to show new counts
- ✅ **Features**: All features become available again

## ⚠️ **Important Notes**

1. **Documents are preserved**: Your uploaded files remain in storage and the database
2. **Data deletion is permanent**: The "💥 Reset All Data" button permanently deletes extractions and analyses
3. **Usage tracking resets**: All usage counts return to 0 for the specified period
4. **Real-time updates**: The UI automatically refreshes to show the new counts

## 🎨 **Button Colors**

- **🔄 Yellow**: Safe reset (usage only)
- **🗑️ Red**: Reset all usage (keep data)
- **💥 Purple**: Dangerous reset (delete data)
- **📅 Green**: Month-specific reset (safe)

## 🔧 **Technical Details**

- All resets work with your current user session
- Updates the `usage_tracking` table in your database
- Automatically refreshes the usage display component
- Handles both existing and new usage tracking records
- Includes proper error handling and user confirmation

## 💡 **Recommended Usage**

- **Daily development**: Use **🔄 Reset Usage Counts** to continue testing
- **Monthly reset**: Use **📅 Reset Current Month** to reset monthly limits
- **Complete cleanup**: Use **💥 Reset All Data** when you want to start over
- **Safe reset**: Use **🗑️ Reset All Usage** when you want to keep your work but reset limits

Now you can continue developing and testing your app without hitting usage limits! 🎉
