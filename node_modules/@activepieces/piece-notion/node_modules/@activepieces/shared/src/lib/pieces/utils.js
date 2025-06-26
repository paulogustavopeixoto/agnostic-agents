"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPieceMajorAndMinorVersion = exports.extractPieceFromModule = exports.getPackageArchivePathForPiece = exports.getPackageSpecForPiece = exports.getPackageAliasForPiece = void 0;
const tslib_1 = require("tslib");
const major_1 = tslib_1.__importDefault(require("semver/functions/major"));
const minor_1 = tslib_1.__importDefault(require("semver/functions/minor"));
const min_version_1 = tslib_1.__importDefault(require("semver/ranges/min-version"));
const activepieces_error_1 = require("../common/activepieces-error");
const piece_1 = require("./piece");
const getPackageAliasForPiece = (params) => {
    const { pieceName, pieceVersion } = params;
    return `${pieceName}-${pieceVersion}`;
};
exports.getPackageAliasForPiece = getPackageAliasForPiece;
const getPackageSpecForPiece = (packageArchivePath, params) => {
    const { packageType, pieceName, pieceVersion } = params;
    switch (packageType) {
        case piece_1.PackageType.REGISTRY: {
            return `npm:${pieceName}@${pieceVersion}`;
        }
        case piece_1.PackageType.ARCHIVE: {
            const archivePath = (0, exports.getPackageArchivePathForPiece)({
                archiveId: params.archiveId,
                archivePath: packageArchivePath,
            });
            return `file:${archivePath}`;
        }
    }
};
exports.getPackageSpecForPiece = getPackageSpecForPiece;
const getPackageArchivePathForPiece = (params) => {
    return `${params.archivePath}/${params.archiveId}.tgz`;
};
exports.getPackageArchivePathForPiece = getPackageArchivePathForPiece;
const extractPieceFromModule = (params) => {
    const { module, pieceName, pieceVersion } = params;
    const exports = Object.values(module);
    for (const e of exports) {
        if (e !== null && e !== undefined && e.constructor.name === 'Piece') {
            return e;
        }
    }
    throw new activepieces_error_1.ActivepiecesError({
        code: activepieces_error_1.ErrorCode.PIECE_NOT_FOUND,
        params: {
            pieceName,
            pieceVersion,
            message: 'Failed to extract piece from module.',
        },
    });
};
exports.extractPieceFromModule = extractPieceFromModule;
const getPieceMajorAndMinorVersion = (pieceVersion) => {
    const minimumSemver = (0, min_version_1.default)(pieceVersion);
    return minimumSemver
        ? `${(0, major_1.default)(minimumSemver)}.${(0, minor_1.default)(minimumSemver)}`
        : `${(0, major_1.default)(pieceVersion)}.${(0, minor_1.default)(pieceVersion)}`;
};
exports.getPieceMajorAndMinorVersion = getPieceMajorAndMinorVersion;
//# sourceMappingURL=utils.js.map