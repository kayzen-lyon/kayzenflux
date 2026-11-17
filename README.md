# Branche « telechargements »

Fichiers relais pour l'espace web IONOS (telechargements.kayzen-lyon.com).
Une tâche cron IONOS lit `MANIFEST` (une ligne par fichier : `sha256 url nom`)
et télécharge chaque fichier dans le dossier `public/` en vérifiant son empreinte
SHA-256. Pour publier une nouvelle version : mettre à jour `MANIFEST` ici.
