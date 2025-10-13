// Test script to verify web scraping functionality
// Run this in the browser console on your dashboard page

async function testWebScraping() {
  console.log('🧪 Testing Web Scraping System...');
  
  try {
    // Test URLs
    const testUrls = [
      'https://example.com',
      'https://httpbin.org/html',
      'https://jsonplaceholder.typicode.com'
    ];
    
    console.log('📝 Creating test jobs...');
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Create test jobs
    const jobs = testUrls.map(url => ({
      user_id: user.id,
      url: url,
      status: 'pending'
    }));
    
    const { data: createdJobs, error: createError } = await supabase
      .from('scraping_jobs')
      .insert(jobs)
      .select();
    
    if (createError) throw createError;
    
    console.log(`✅ Created ${createdJobs.length} test jobs`);
    
    // Wait a moment for automatic processing
    console.log('⏳ Waiting for automatic processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check job statuses
    const { data: updatedJobs, error: fetchError } = await supabase
      .from('scraping_jobs')
      .select('*')
      .in('id', createdJobs.map(j => j.id));
    
    if (fetchError) throw fetchError;
    
    console.log('📊 Job Status Summary:');
    const statusCounts = updatedJobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} jobs`);
    });
    
    // Check scraped data
    const { data: scrapedData, error: dataError } = await supabase
      .from('scraped_data')
      .select('*')
      .in('job_id', createdJobs.map(j => j.id));
    
    if (dataError) throw dataError;
    
    console.log(`📄 Scraped ${scrapedData.length} data records`);
    
    if (scrapedData.length > 0) {
      console.log('📋 Sample scraped data:');
      scrapedData.slice(0, 2).forEach((data, index) => {
        console.log(`  ${index + 1}. ${data.title || 'No title'} - ${data.url}`);
      });
    }
    
    // Test manual processing if there are still pending jobs
    const pendingJobs = updatedJobs.filter(job => job.status === 'pending');
    if (pendingJobs.length > 0) {
      console.log(`🔄 Testing manual processing for ${pendingJobs.length} pending jobs...`);
      
      const { data: processResult, error: processError } = await supabase.functions.invoke('process-scraping-jobs');
      
      if (processError) {
        console.error('❌ Manual processing failed:', processError);
      } else {
        console.log('✅ Manual processing result:', processResult);
      }
    }
    
    console.log('🎉 Web scraping test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testWebScraping();