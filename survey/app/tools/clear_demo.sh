#!/bin/sh
# Deletes ONLY the FAKE preview collection demo_responses.
firebase firestore:delete demo_responses --recursive --force --project null-hypothesis-study-form
