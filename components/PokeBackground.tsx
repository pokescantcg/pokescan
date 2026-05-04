import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { Image } from "expo-image";

const POKEMON_SPRITES = [
  { id: 6,   x: 0.55, y: 0.02, size: 220, rotate: "-12deg" },  // Charizard
  { id: 131, x: 0.05, y: 0.20, size: 200, rotate: "8deg"  },   // Lapras
  { id: 143, x: 0.52, y: 0.38, size: 210, rotate: "-6deg" },   // Snorlax
  { id: 149, x: 0.08, y: 0.56, size: 195, rotate: "10deg" },   // Dragonite
  { id: 248, x: 0.54, y: 0.68, size: 205, rotate: "-9deg" },   // Tyranitar
  { id: 384, x: 0.06, y: 0.82, size: 190, rotate: "7deg"  },   // Rayquaza
];

function spriteUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

export default function PokeBackground({ opacity = 0.15 }: { opacity?: number }) {
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
