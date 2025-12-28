<?php

/**
 * Migration pour ajouter firebase_uid à la table users
 *
 * Commande: php artisan make:migration add_firebase_uid_to_users_table
 * Puis copier le contenu ci-dessous
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // UID Firebase (généré lors de la première connexion à l'outil)
            $table->string('firebase_uid', 128)->nullable()->after('id');

            // Index pour les recherches rapides
            $table->index('firebase_uid');

            // Contrainte unique (un user = un firebase_uid)
            $table->unique('firebase_uid');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['firebase_uid']);
            $table->dropIndex(['firebase_uid']);
            $table->dropColumn('firebase_uid');
        });
    }
};
