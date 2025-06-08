import { initializeDatabase } from './database/config'
import { Tenant } from './database/entities/Tenant'

export const getTenantContext = async (tenantId: string) => {
  try {
    const dataSource = await initializeDatabase()
    const tenantRepository = dataSource.getRepository(Tenant)
    
    const tenant = await tenantRepository.findOne({
      where: { id: tenantId, isActive: true }
    })

    return { tenant, error: null }
  } catch (error) {
    console.error('Error fetching tenant:', error)
    return { tenant: null, error }
  }
}

export const getTenantBySlug = async (slug: string) => {
  try {
    const dataSource = await initializeDatabase()
    const tenantRepository = dataSource.getRepository(Tenant)
    
    const tenant = await tenantRepository.findOne({
      where: { slug, isActive: true }
    })

    return { tenant, error: null }
  } catch (error) {
    console.error('Error fetching tenant by slug:', error)
    return { tenant: null, error }
  }
}

export const updateTenantSlackConfig = async (
  tenantId: string, 
  slackConfig: {
    botToken?: string
    signingSecret?: string
    teamId?: string
    teamName?: string
    installedBy?: string
  }
) => {
  try {
    const dataSource = await initializeDatabase()
    const tenantRepository = dataSource.getRepository(Tenant)
    
    const tenant = await tenantRepository.findOne({
      where: { id: tenantId }
    })

    if (!tenant) {
      throw new Error('Tenant not found')
    }

    tenant.slackConfig = {
      ...tenant.slackConfig,
      ...slackConfig
    } as Tenant['slackConfig']

    await tenantRepository.save(tenant)
    return { success: true, tenant }
  } catch (error) {
    console.error('Error updating tenant Slack config:', error)
    return { success: false, error }
  }
}

export const createTenant = async (data: {
  name: string
  slug: string
}) => {
  try {
    const dataSource = await initializeDatabase()
    const tenantRepository = dataSource.getRepository(Tenant)
    
    const tenant = tenantRepository.create(data)
    await tenantRepository.save(tenant)
    
    return { tenant, error: null }
  } catch (error) {
    console.error('Error creating tenant:', error)
    return { tenant: null, error }
  }
} 