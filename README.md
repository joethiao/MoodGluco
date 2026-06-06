# MoodGluco

MoodGluco est une application mobile conçue pour accompagner les personnes âgées atteintes de diabète de type 2. Son objectif est d'offrir un compagnon numérique simple, rassurant et facile à utiliser afin d'aider les utilisateurs dans la gestion quotidienne de leur maladie.

## Fonctionnalités principales

### Avatar interactif

L'utilisateur peut échanger avec un avatar capable de répondre à des questions générales sur le diabète de type 2 à l'aide d'explications simples et compréhensibles. L'avatar aide également l'utilisateur à naviguer dans l'application et à gérer certaines actions, comme la modification des informations du profil.

> **Note :** L'avatar ne remplace pas un professionnel de santé et ne fournit aucun diagnostic médical.

### Rappels de médicaments

L'application permet de créer et de gérer des rappels de prise de médicaments. Des notifications sont envoyées aux horaires définis, et l'utilisateur peut confirmer facilement qu'il a bien pris son traitement.

## Technologies utilisées

- **React Native / Expo** : Développement de l'application mobile
- **Ollama** : Modèle d'intelligence artificielle exécuté localement pour générer les réponses de l'avatar
- **API ElevenLabs** : Génération de réponses vocales naturelles pour l'avatar
- **AsyncStorage** : Stockage local des données utilisateur et des rappels de médicaments

## Confidentialité

MoodGluco adopte une approche centrée sur la protection de la vie privée. Les informations des utilisateurs sont stockées localement lorsque cela est possible, et l'intelligence artificielle utilisée pour générer les réponses textuelles fonctionne localement grâce à Ollama.

Pour la synthèse vocale, l'application utilise l'API ElevenLabs. Seul le texte nécessaire à la génération de la réponse vocale est transmis à ce service externe.

## Avertissement

MoodGluco est une application d'accompagnement et d'aide à l'observance des traitements. Elle ne constitue pas un dispositif médical et ne remplace en aucun cas l'avis, le diagnostic ou les recommandations d'un professionnel de santé.

Toute décision médicale doit être prise en consultation avec un médecin ou un autre professionnel qualifié.
