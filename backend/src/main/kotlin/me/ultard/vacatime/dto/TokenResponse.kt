package me.ultard.vacatime.dto

data class TokenResponse(
    val accessToken: String,
    val refreshToken: String,
    val mustChangePassword: Boolean,
)
