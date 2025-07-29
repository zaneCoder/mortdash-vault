import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');
    
    // Get current timestamp
    const timestamp = new Date().toISOString();
    
    // Basic health check response
    const healthResponse = {
      status: 'healthy',
      timestamp,
      service: 'mortdash-vault',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      tag: tag || 'none',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    // Return 200 OK with health information
    return NextResponse.json(healthResponse, { status: 200 });
  } catch (error) {
    console.error('Health check error:', error);
    
    // Return 500 if there's an internal error
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support HEAD requests for lightweight health checks
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}