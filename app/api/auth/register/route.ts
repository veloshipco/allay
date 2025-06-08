import { NextRequest, NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/database/config'
import { User } from '@/lib/database/entities/User'
import { hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await req.json()

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const dataSource = await initializeDatabase()
    const userRepository = dataSource.getRepository(User)

    // Check if user already exists
    const existingUser = await userRepository.findOne({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Create new user
    const hashedPassword = await hashPassword(password)
    const user = userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName
    })

    await userRepository.save(user)

    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 