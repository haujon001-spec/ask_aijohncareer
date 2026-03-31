/**
 * Resume Consolidation Client
 * Frontend utility to trigger resume consolidation via API
 */

/**
 * Trigger resume consolidation on the server
 * @param {string} sourceFile - Optional specific resume file to consolidate
 * @returns {Promise} Consolidation result
 */
export async function consolidateResume(sourceFile = null) {
  try {
    console.log('📤 Sending consolidation request...');
    
    const response = await fetch('/api/consolidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceFile: sourceFile
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Consolidation successful!');
      return {
        success: true,
        profile: data.profile,
        message: data.message
      };
    } else {
      console.error('❌ Consolidation failed:', data.message);
      return {
        success: false,
        message: data.message
      };
    }
  } catch (error) {
    console.error('❌ Error calling consolidation API:', error.message);
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Trigger consolidation after file upload
 * Can be called from a file upload component
 * @param {File} file - Resume file object
 */
export async function consolidateAfterUpload(file) {
  // Optional: Upload file to server first if needed
  // For now, server will look for latest file in data_raw/resume/
  
  console.log(`📄 Resume uploaded: ${file.name}`);
  console.log('⏳ Triggering consolidation...');
  
  // Give backend time to write file
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return consolidateResume();
}

export default {
  consolidateResume,
  consolidateAfterUpload
};
