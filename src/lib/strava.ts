export interface StravaActivity {
  id: number
  name: string
  type: string
  distance: number
  moving_time: number
  elapsed_time: number
  total_elevation_gain: number
  start_date: string
  start_date_local: string
  location_city?: string
  location_country?: string
  sport_type: string
  description?: string
}

export interface StravaTokenResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete: {
    id: number
    firstname: string
    lastname: string
  }
}

export class StravaAPI {
  private clientId: string
  private clientSecret: string
  private redirectUri: string

  constructor() {
    this.clientId = process.env.STRAVA_CLIENT_ID!
    this.clientSecret = process.env.STRAVA_CLIENT_SECRET!
    this.redirectUri = process.env.STRAVA_REDIRECT_URI!
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'read,activity:read',
    })
    
    return `https://www.strava.com/oauth/authorize?${params.toString()}`
  }

  async exchangeCodeForToken(code: string): Promise<StravaTokenResponse> {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code for token')
    }

    return response.json()
  }

  async refreshToken(refreshToken: string): Promise<StravaTokenResponse> {
    const response = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to refresh token')
    }

    return response.json()
  }

  async getActivities(
    accessToken: string,
    page = 1,
    perPage = 200
  ): Promise<StravaActivity[]> {
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch activities')
    }

    return response.json()
  }

  async getAllActivities(accessToken: string): Promise<StravaActivity[]> {
    const allActivities: StravaActivity[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const activities = await this.getActivities(accessToken, page)
      
      if (activities.length === 0) {
        hasMore = false
      } else {
        allActivities.push(...activities)
        page++
      }
    }

    return allActivities
  }

  filterHikingActivities(activities: StravaActivity[]): StravaActivity[] {
    const hikingTypes = ['Hike']
    return activities.filter(activity => {
      // First check if it's a hiking activity
      const isHikingType = hikingTypes.includes(activity.type) || 
                          hikingTypes.includes(activity.sport_type)
      
      // Then check if it has the #3800km hashtag in the description
      const hasHashtag = activity.description && 
                        activity.description.toLowerCase().includes('#3800km')
      
      return isHikingType && hasHashtag
    })
  }
}

export const stravaAPI = new StravaAPI() 