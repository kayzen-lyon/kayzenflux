/*
 * Lanceur Python minimal pour KAYZEN Flux (Android).
 * Chargé par le chargeur dynamique musl embarqué (libkzmusl.so), il démarre
 * l'interpréteur CPython de la distribution officielle de yt-dlp. Aucune
 * logique propre : PYTHONHOME et les arguments sont fournis par l'application.
 *
 * preadv2/pwritev2 : absents de musl 1.2.4 (ajoutés en 1.2.5) mais référencés
 * par libpython ; on les fournit ici (exportés) via l'appel système direct.
 */
#define _GNU_SOURCE
#include <sys/syscall.h>
#include <sys/uio.h>
#include <unistd.h>

int Py_BytesMain(int argc, char **argv);

ssize_t preadv2(int fd, const struct iovec *iov, int cnt, off_t off, int flags) {
    return syscall(SYS_preadv2, fd, iov, cnt, (long)off, (long)(off >> 32), flags);
}

ssize_t pwritev2(int fd, const struct iovec *iov, int cnt, off_t off, int flags) {
    return syscall(SYS_pwritev2, fd, iov, cnt, (long)off, (long)(off >> 32), flags);
}

int main(int argc, char **argv) {
    return Py_BytesMain(argc, argv);
}
