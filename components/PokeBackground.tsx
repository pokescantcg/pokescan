import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { Image } from "expo-image";

// Iconic Pokemon artwork from PokeAPI official artwork sprites
const POKEMON_SPRITES = [
  { id: 6,   x: 0.72, y: 0.04, size: 180, rotate: "-15deg" },  // Charizard
  { id: 131, x: -0.05, y: 0.22, size: 160, rotate: "10deg" },  // Lapras
  { id: 143, x: 0.60, y: 0.42, size: 170, rotate: "-8deg" },   // Snorlax
  { id: 149, x: -0.08, y: 0.60, size: 155, rotate: "12deg" },  // Dragonite
  { id: 248, x: 0.65, y: 0.72, size: 165, rotate: "-10deg" },  // Tyranitar
  { id: 384, x: -0.04, y: 0.84, size: 150, rotate: "8deg" },   // Rayquaza
];

function spriteUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

interface PokeBackgroundProps {
  opacity?: number;
  tint?: string;
}

export default function PokeBackground({ opacity = 0.06 }: PokeBackgroundProps) {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {POKEMON_SPRITES.map((p) => (
        <Image
          key={p.id}
          source={{ uri: spriteUrl(p.id) }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            left: p.x * width,
            top: p.y * height,
            opacity,
            transform: [{ rotate: p.rotate }],
          }}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      ))}
    </View>
  );
}
